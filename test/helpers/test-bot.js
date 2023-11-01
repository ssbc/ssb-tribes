const Server = require('scuttle-testbot')
const Application = require('../../method/deprecated/application.js')

module.exports = function TestBot (opts = {}) {
  // opts = {
  //   name: String,
  //   startUnclean: Boolean,
  //   keys: SecretKeys
  //
  //   replicate: Boolean
  //   application: Boolean
  // }

  let stack = Server // eslint-disable-line
    .use(require('ssb-db2/core'))
    .use(require('ssb-classic'))
    .use(require('ssb-db2/compat'))
    .use(require('ssb-db2/compat/feedstate'))
    .use(require('ssb-box2'))
    .use(require('../..'))

  if (opts.installReplicate === true) {
    stack = stack.use(require('ssb-replicate'))
  }

  const ssb = stack({
    ...opts,
    box2: {
      legacyMode: true,
      ...opts.box2
    },
    // we don't want testbot to import db2 for us, we want more granularity and control of dep versions
    db1: true
  })

  if (opts.debug) {
    ssb.post(m => {
      ssb.get({ id: m.key, private: true }, (_, value) => {
        console.log(value.sequence, m.key)
        console.log(JSON.stringify(value.content, null, 2))
      })
    })
  }

  if (opts.application === true) {
    ssb.tribes.application = Application(ssb)
  }

  return ssb
}
