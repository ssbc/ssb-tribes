const { isCloakedMsg: isGroup } = require('ssb-ref')
const pull = require('pull-stream')
const Reduce = require('@tangle/reduce')
const Strategy = require('@tangle/strategy')
const { where, slowEqual, toPullStream } = require('ssb-db2/operators')

// for figuring out what "previous" should be for the group

module.exports = function GetGroupTangle (server, keystore, tangle = 'group') {
  const strategy = new Strategy({})

  return function getGroupTangle (groupId, cb) {
    if (!isGroup(groupId)) return cb(new Error(`get-group-tangle expects valid groupId, got: ${groupId}`))

    server.box2.getGroupInfo(groupId, (err, info) => {
      if (err) return cb("Couldn't get group info for group tangle", { cause: err })
      if (!info) return cb(new Error(`get-group-tangle: unknown groupId ${groupId}`))

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
          cb(null, {
            root: info.root,
            previous: Object.keys(reduce.state)
          })
        })
      )
    })
  }
}
