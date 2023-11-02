const { isCloakedMsg: isGroup } = require('ssb-ref')
const pull = require('pull-stream')
const Reduce = require('@tangle/reduce')
const Strategy = require('@tangle/strategy')
const { allocAndEncode, seekKey2 } = require('bipf')
const { where, equal, toPullStream } = require('ssb-db2/operators')

// for figuring out what "previous" should be for the group

const B_CONTENT = allocAndEncode('content')
const B_TANGLES = allocAndEncode('tangles')
const B_ROOT = allocAndEncode('root')

module.exports = function GetGroupTangle (server, _, tangle = 'group') {
  const strategy = new Strategy({})

  const B_TANGLE = allocAndEncode(tangle)

  function seekTanglesTangleRoot (buffer, start, pValue) {
    if (pValue < 0) return -1
    const pValueContent = seekKey2(buffer, pValue, B_CONTENT, 0)
    if (pValueContent < 0) return -1
    const pValueContentTangles = seekKey2(buffer, pValueContent, B_TANGLES, 0)
    if (pValueContentTangles < 0) return -1
    const pValueContentTanglesTangle = seekKey2(buffer, pValueContentTangles, B_TANGLE, 0)
    if (pValueContentTanglesTangle < 0) return -1
    return seekKey2(buffer, pValueContentTanglesTangle, B_ROOT, 0)
  }

  return function getGroupTangle (groupId, cb) {
    if (!isGroup(groupId)) return cb(new Error(`get-group-tangle expects valid groupId, got: ${groupId}`))

    server.box2.getGroupInfo(groupId, (err, info) => {
      if (err) return cb(Error("Couldn't get group info for group tangle", { cause: err }))
      if (!info) return cb(new Error(`get-group-tangle: unknown groupId ${groupId}`))

      // NOTE: a query which gets all update messages to the root message

      pull(
        server.db.query(
          where(
            equal(seekTanglesTangleRoot, info.root, { indexType: `tangles${tangle}Update`, prefix: true })
          ),
          toPullStream()
        ),
        pull.map(msg => ({
          key: msg.key,
          previous: msg.value.content.tangles[tangle].previous
        })),
        pull.collect((err, nodes) => {
          if (err) return cb(err)

          // NOTE: db query does not get root node
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
