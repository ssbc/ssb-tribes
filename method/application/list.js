const pull = require('pull-stream')

module.exports = function GroupApplicationList (server) {
  return function groupApplicationList ({ groupId, accepted }, cb) {
    if (typeof accepted !== 'boolean' && typeof accepted !== 'undefined') {
      throw new Error(
        'tribes.application.list expected accepted to be (undefined | true | false)'
      )
    }
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

    pull(
      // server.messagesByType({ type: 'group/application', private: true }),
      server.query.read({ query, private: true }),
      pull.map(i => i.key),
      pull.asyncMap(server.tribes.application.get),
      pull.filter(i => {
        if (accepted === undefined) return true
        if (accepted === true) return i.addMember && i.addMember.length
        if (accepted === false) return !i.addMember || i.addMember.length === 0
      }),
      pull.collect((err, data) => {
        cb(err, data)
      })
    )
  }
}
