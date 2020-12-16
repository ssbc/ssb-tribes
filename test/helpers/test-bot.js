const Server = require('scuttle-testbot')

module.exports = function TestBot (opts = {}) {
  // opts = {
  //   name: String,
  //   startUnclean: Boolean,
  //   keys: SecretKeys
  //
  //   replicate: Boolean
  // }

  let stack = Server // eslint-disable-line
    .use(require('../..')) // ssb-tribes
    .use(require('ssb-backlinks'))
    .use(require('ssb-query'))

  if (opts.installReplicate === true) {
    stack = stack.use(require('ssb-replicate'))
  }

  return stack(opts)
}
