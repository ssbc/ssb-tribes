const pull = require('pull-stream')

module.exports = function GroupApplicationList (server) {
  return function groupApplicationList (groupId, cb) {
    const query = [
      {
        $filter: {
          value: {
            content: {
              type: 'group/application',
              groupId
            }
          }
        }
      }
    ]

    pull(
      server.query.read({ query }),
      pull.collect((err, data) => {
        cb(err, data)
      })
    )
  }
}
