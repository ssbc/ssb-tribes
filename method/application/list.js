const pull = require('pull-stream')
const paraMap = require('pull-paramap')
const { isCloakedMsg: isGroup } = require('ssb-ref')

module.exports = function GroupApplicationList (server) {
  return function groupApplicationList (opts, cb) {
    if (typeof opts === 'function') return groupApplicationList({}, cb)

    if (opts.get === true) opts.get = server.tribes.application.get
    const optsError = findOptsError(opts)
    if (optsError) return cb(optsError)

    const { groupId, get, accepted } = opts
    const queryGroupId = [
      {
        $filter: {
          value: {
            content: {
              type: 'group/application',
              groupId,
              tangles: {
                application: {
                  root: null
                }
              }
            }
          }
        }
      }
    ]
    const queryAll = [
      {
        $filter: {
          value: {
            content: {
              type: 'group/application',
              tangles: {
                application: {
                  root: null
                }
              }
            }
          }
        }
      }
    ]

    const query = groupId ? queryGroupId : queryAll

    // TODO this may be to sugary for such a low level module
    // I think filtering and fetching application detail should perhaps be handled elsewhere
    // that we you get pass in a get

    pull(
      // server.messagesByType({ type: 'group/application', private: true }),
      server.query.read({ query, private: true }),
      pull.map(i => i.key),
      get !== undefined
        ? paraMap(get, 4) // 4 = width of parallel querying
        : null,
      accepted !== undefined
        ? pull.filter(i => {
          if (accepted === true) return i.addMember && i.addMember.length
          if (accepted === false) return !i.addMember || i.addMember.length === 0
        })
        : null,
      pull.collect((err, data) => {
        cb(err, data)
      })
    )
  }
}

function findOptsError ({ groupId, get, accepted }) {
  const head = 'tribes.application.list expected '
  if (groupId && !isGroup(groupId)) {
    return new Error(`${head} "groupId" to be (undefined | GroupId}, got ${groupId}`)
  }
  if (get && typeof get !== 'function') {
    return new Error(`${head} "get" to be (Function), got ${typeof get}`)
  }
  if (accepted !== undefined) {
    if (typeof accepted !== 'boolean') {
      return new Error(`${head} "accepted" to be (undefined | true | false), got ${accepted}`)
    }
    if (typeof get !== 'function') {
      return new Error(`${head} declaring "accepted" requires "get" to be (Function), got ${typeof get}`)
    }
  }

  return null
}
