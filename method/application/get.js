const pull = require('pull-stream')
module.exports = function GroupApplicationGet (server) {
  return function groupApplicationGet (applicationId, cb) {
    const query = [
      {
        $filter: {
          dest: applicationId
        }
      }
    ]

    server.get({ id: applicationId, private: true }, (rootErr, rootData) => {
      pull(
        server.backlinks.read({ query }),
        pull.collect((err, data) => {
          // console.log('groupApplicationGet -> data', data)
          if (data.length < 1) cb(err, rootData)
          else {
            cb(err, data[0])
          }
        })
      )
    })
  }
}
