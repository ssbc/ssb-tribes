const Server = require('scuttle-testbot')

module.exports = function (opts) {
  // opts = {
  //   name: String,
  //   startUnclean: Boolean,
  //   keys: SecretKeys
  // }

  const server = Server // eslint-disable-line
    .use(require('../')) // ssb-private2
    .call(opts)

  return server
}
