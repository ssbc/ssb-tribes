const pull = require('pull-stream')

module.exports = function GroupApplicationList (server) {
  return function groupApplicationList (groupId, accepted, cb) {
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

    pull(
      server.query.read({ query: groupId ? queryGroupId : queryAll }),
      pull.map(i => i.key),
      pull.asyncMap(server.tribes.application.get),
      pull.filter(i => {
        if (accepted !== null) {
          if (accepted === true) {
            return i.addMember
          } else return !i.addMember
        } else return i
      }),
      pull.collect((err, data) => {
        cb(err, data)
      })
    )
  }
}
