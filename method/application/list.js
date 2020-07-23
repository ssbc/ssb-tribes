const pull = require('pull-stream')

module.exports = function GroupApplicationList (server) {
  return function groupApplicationList (groupId, cb) {
    const query = [{
      $filter: {
        value: {
          content: {
            type: 'group/application'
          }
        }
      }
    }]

    pull(
      server.query.read({ query }),
      pull.collect((err, data) => {
        console.log('groupApplicationList -> err, data', err, data)
        cb(err, data)
      })
    )
  }
}
