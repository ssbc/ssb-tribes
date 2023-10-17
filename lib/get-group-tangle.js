const { isCloakedMsg: isGroup } = require('ssb-ref')
const pull = require('pull-stream')
const Reduce = require('@tangle/reduce')
const Strategy = require('@tangle/strategy')
const { where, slowEqual, isDecrypted, live: dbLive, toPullStream } = require('ssb-db2/operators')

// for figuring out what "previous" should be for the group

module.exports = function GetGroupTangle (server, keystore, tangle = 'group') {
  const strategy = new Strategy({})
  const cache = new Map([]) // groupId > new Reduce (tangleTips)

  // LISTEN
  // listen to all new messages that come in
  // if a new message comes in which has msg.value.content.tangles.group.root that is in cache
  // update the value in the cache (this will use our new addNodes functionality)

  pull(
    server.db.query(
      where(isDecrypted('box2')),
      dbLive({ old: false }),
      toPullStream()
    ),
    // we need to have this here because rebuilds cause the stream to start again (at least with db1) and updateCache isn't idempotent
    pull.unique('key'),
    pull.drain(updateCache)
  )

  // TODO: maybe remove the cache, like we did in tribes2?
  function updateCache (msg) {
    const { recps, tangles } = msg.value.content
    // If the message has recipients get the group ID, which may be the first slot.
    const msgGroupId = recps && recps[0]
    // Check if msg is part of a cached group
    if (cache.has(msgGroupId)) {
      // Add message to Reduce
      if (tangles && tangles.group && tangles.group.previous) {
        cache.get(msgGroupId).addNodes([{
          key: msg.key,
          previous: tangles.group.previous
        }]) // Get key and previous from msg
      }
    }
  }

  return function getGroupTangle (groupId, cb) {
    if (!isGroup(groupId)) return cb(new Error(`get-group-tangle expects valid groupId, got: ${groupId}`))

    server.box2.getGroupInfo(groupId, (err, info) => {
      if (err) return cb("Couldn't get group info for group tangle", { cause: err })
      if (!info) return cb(new Error(`get-group-tangle: unknown groupId ${groupId}`))

      // if it's in the cache, then get the cached value, then callback
      if (cache.has(groupId)) {
        // this timeout seems to help for some reason. in some cases messages were posted too fast with tangles 'in parallel', e.g. 2 messages both just having previous: [rootMsgId]
        return setTimeout(() => {
          return cb(null, {
            root: info.root,
            previous: Object.keys(cache.get(groupId).state)
          })
        }, 0)
      }
      // if not in cache, compute it and add to the cache

      const query = [
        {
          $filter: {
            dest: info.root,
            value: {
              content: {
                tangles: {
                  [tangle]: { root: info.root }
                }
              }
            }
          }
        },
        {
          $map: {
            key: ['key'],
            previous: ['value', 'content', 'tangles', tangle, 'previous']
          }
        }
      ]
      // NOTE: a query which gets all update messages to the root message

      pull(
        server.db.query(
          where(
            slowEqual(`value.content.tangles.${tangle}.root`, info.root),
          ),
          toPullStream()
        ),
        pull.map(msg => ({
          key: msg.key,
          previous: msg.value.content.tangles[tangle].previous
        })),
        pull.collect((err, nodes) => {
          if (err) return cb(err)

          // NOTE: backlink query does not get root node
          nodes.push({ key: info.root, previous: null })

          // Create a Reduce using the message contents
          // NOTE - do NOT store the whole msg (node)
          // we're not doing any reducing of transformations, we care only about
          // reducing the graph to find the tips
          // each node should be pruned down to e.g. { key: '%D', previous: ['%B', '%C'] }

          const reduce = new Reduce(strategy, { nodes })
          // Store Reduce in the cache to use/update it later.
          cache.set(groupId, reduce)
          cb(null, {
            root: info.root,
            previous: Object.keys(reduce.state)
          })
        })
      )
    })
  }
}
