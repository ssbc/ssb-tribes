const { isCloakedMsg: isGroup } = require('ssb-ref')
const pull = require('pull-stream')
const Reduce = require('@tangle/reduce')
const Strategy = require('@tangle/strategy')

// for figuring out what "previous" should be for the group

const TANGLE = 'group'
const strategy = new Strategy({})

module.exports = function GetGroupTangle (server, keystore) {
  const cache = new Map([]) // groupId > new Reduce (tangleTips)

  // LISTEN
  // listen to all new messages that come in
  // if a new message comes in which has msg.value.content.tangles.group.root that is in cache
  // update the value in the cache (this will use our new addNodes functionality)

  pull(
    server.createLogStream({ live: true, old: false, private: true }),
    pull.drain(updateCache)
  )
  // server.post(m => server.get({ id: m.key, private: true, meta: true }, (err, msg) => {
  //   updateCache(msg)
  // }))

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

    const info = keystore.group.get(groupId)
    if (!info) return cb(new Error(`get-group-tangle: unknown groupId ${groupId}`))

    // if it's in the cache, then get the cached value, then callback
    if (cache.has(groupId)) {
      return cb(null, {
        root: info.root,
        previous: Object.keys(cache.get(groupId).state)
      })
    }
    // if not in cache, compute it and add to the cache

    const query = [
      {
        $filter: {
          dest: info.root,
          value: {
            content: {
              tangles: {
                [TANGLE]: { root: info.root }
              }
            }
          }
        }
      },
      {
        $map: {
          key: ['key'],
          previous: ['value', 'content', 'tangles', TANGLE, 'previous']
        }
      }
    ]
    // NOTE: a query which gets all update messages to the root message

    pull(
      server.backlinks.read({ query }),
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
  }
}
