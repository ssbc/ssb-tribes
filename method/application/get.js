module.exports = function GroupApplicationGet (server) {
  return function groupApplicationGet (applicationId, opts = {}, cb) {
    server.get({ id: applicationId, private: true }, (err, data) => {
      cb(err, data)
    })
  }
}
