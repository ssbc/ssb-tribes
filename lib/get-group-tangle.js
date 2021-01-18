const { isCloakedMsg: isGroup } = require('ssb-ref')
const pull = require('pull-stream')
const Reduce = require('@tangle/reduce')
const Strategy = require('@tangle/strategy')

// for figuring out what "previous" should be for the group

const TANGLE = 'group'
const strategy = new Strategy({}) //, getBacklinks }), default is node => node.previous

module.exports = function GetGroupTangle (server, keystore) {
  const cache = {} // groupId > new Reduce (tangleTips)

  return function getGroupTangle (groupId, cb) {
    // return cb(null, { root: "", previous: [] })
    if (!isGroup(groupId)) return cb(new Error(`get-group-tangle expects valid groupId, got: ${groupId}`))
    // LISTEN
    // listen to all new messages that come in
    // if a new message comes in which has msg.value.content.tangles.group.root that is in cache
    // update the value in the cache (this will use our new addNodes functionality)
    //
    // use this to listen:
    // server.post(msg => {
    //   // Check if msg is part of a cached group
    //   if (groupId in cache) { // change to groupId of new message
    //     console.log('Trying to add to new message to cache')
    //     // Add message to Reduce
    //     cache[groupId].addNodes([{ key: '%D', previous: ['%B', '%C'] }])  // Get key and previous from msg
    //   }
    // })

    //  - groupId is a cloaked reference to a group:
    //     - %asdasdasdasdsasdasda.cloaked
    //     - info.root is the id of the root message of a group
    //  - previous is the "tips" we have just calculated and are about to extend on
    //
    const info = keystore.group.get(groupId)
    if (!info) return cb(new Error(`get-group-tangle: unknown groupId ${groupId}`))

    // if it's in the cache, then get the cached value, then callback
    if (groupId in cache) {
      console.log('Found groupID in cache')
      // Currently not kept up to date.
      return cb(null, { root: info.root, previous: Object.keys(cache.groupId.state) })
    }

    console.log('Did not find groupID in cache')
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

        // console.log('Msgs:', nodes)

        // dummy root message, saves us getting it from db
        // const entry = {
        //   key: info.root,
        //   tangle: { root: null, previous: null }
        // }
        // const previous = getHeads(entry, nodes, {
        //   getThread: m => m.tangle
        // })

        // Create a Reduce using the message contents
        // NOTE - do NOT store the whole msg (node)
        // we're not doing any reducing of transformations, we care only about reducing the graph
        // to find the tips
        // each node should be pruned down to e.g. { key: '%D', previous: ['%B', '%C'] }

        console.log('nodes', nodes)
        const reduce = new Reduce(strategy, { nodes })
        const tipObject = reduce.state
        // This empty strategy gives reduce.state like { B: {} }
        // console.log('Reduce state', reduce.state)

        // Store Reduce in the cache to use/update it later.
        cache.groupId = reduce

        cb(null, { root: info.root, previous: Object.keys(tipObject) })
        // Object.keys(tipObject) vs. tipObject
        // This callback seems to be used to calculate the previous in msgs.
      })
    )
  }
}
