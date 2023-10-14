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
    //.use(require('ssb-backlinks'))
    //.use(require('ssb-query'))
    .use(require('ssb-db2/compat'))
    .use(require('ssb-db2/compat/feedstate'))
    //.use(require('ssb-box2'))
    .use(require('../..')) // ssb-tribes - NOTE load it after ssb-backlinks

  if (opts.installReplicate === true) {
    stack = stack.use(require('ssb-replicate'))
  }

  if (opts.name) opts.name = 'ssb-tribes/' + opts.name

  const ssb = stack({
    box2: {
      legacyMode: true,
      ...opts.box2
    },
    ...opts
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

  ssb.close.hook((close, args) => {
    return setTimeout(() => {
      close(...args)
    }, 10 * 1000)
  })

  return ssb
}
