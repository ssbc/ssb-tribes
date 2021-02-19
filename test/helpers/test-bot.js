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

  const ssb = stack(opts)

  let rebuilding = false
  ssb.rebuild.hook((rebuild, args) => {
    rebuilding = true

    rebuild((err) => {
      rebuilding = false

      const cb = args[0]
      if (cb) cb(err)
    })
  })

  // HACK - calling close while a rebuild is happening really wrecks the tests for some reason
  // this is a crude way to ensure we wait before it's called for proper
  ssb.close.hook((close, args) => {
    function waitTillSync () {
      if (!rebuilding && ssb.status().sync.sync) return close(...args)

      setTimeout(waitTillSync, 100)
    }

    setTimeout(waitTillSync, 100)
  })

  return ssb
}
