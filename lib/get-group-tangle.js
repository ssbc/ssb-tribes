const getHeads = require('ssb-tangle/graph-tools/get-heads')
const isCloaked = require('./is-cloaked-msg-id')
const pull = require('pull-stream')

// for figuring out what "previous" should be for the group

const TANGLE = 'group'

module.exports = function GetGroupTangle (server, keystore) {
  return function getGroupTangle (groupId, cb) {
    if (!isCloaked(groupId)) return cb(new Error(`get-group-tangle expects valid groupId, got: ${groupId}`))

    const info = keystore.group.get(groupId)
    if (!info) return cb(new Error(`get-group-tangle: unknown groupId ${groupId}`))

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
          tangle: ['value', 'content', 'tangles', TANGLE]
        }
      }
    ]
    // a query which gets all update messages to the root message

    pull(
      server.backlinks.read({ query }),
      pull.collect((err, msgs) => {
        if (err) return cb(err)

        server.get({ id: info.root, private: true, meta: true }, (err, root) => {
          if (err) return cb(err)

          const entry = {
            key: root.key,
            tangle: root.value.content.tangles[TANGLE]
          }
          const previous = getHeads(entry, msgs, {
            getThread: m => m.tangle
          })

          cb(null, { root: info.root, previous })
        })
      })
    )

    // simpler to understand $filter only query
    /*

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
      }
    ]
    // a query which gets all update messages to the root message

    pull(
      server.backlinks.read({ query }),
      pull.collect((err, msgs) => {
        if (err) return cb(err)

        server.get({ id: info.root, private: true, meta: true }, (err, root) => {
          const previous = getHeads(root, msgs, {
            getThread: m => m.value.content.tangles[TANGLE]
          })

          cb(null, { root: info.root, previous })
        })
      })
    )
    */
  }
}
