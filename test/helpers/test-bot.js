const Server = require('scuttle-testbot')

module.exports = function TestBot (opts) {
  // opts = {
  //   name: String,
  //   startUnclean: Boolean,
  //   keys: SecretKeys
  // }

  const server = Server // eslint-disable-line
    .use(require('../..')) // ssb-tribes
    .use(require('ssb-backlinks'))
    .use(require('ssb-query'))(opts)

  return server
}
