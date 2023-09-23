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
    .use(require('ssb-backlinks'))
    .use(require('ssb-query'))
    .use(require('../..')) // ssb-tribes - NOTE load it after ssb-backlinks

  if (opts.installReplicate === true) {
    stack = stack.use(require('ssb-replicate'))
  }

  if (opts.name) opts.name = 'ssb-tribes/' + opts.name

  const ssb = stack({
    db1: true,
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

  // HACK - calling close while a rebuild is happening really wrecks the tests for some reason
  // this is a crude way to ensure we wait before it's called for proper
  const state = {
    isRebuilding: false,
    get isReadyToClose () {
      return !this.isRebuilding // && ssb.status().sync.sync
    }
  }
  ssb.rebuild.hook((rebuild, [cb]) => {
    state.isRebuilding = true

    rebuild((err) => {
      state.isRebuilding = false

      if (cb) cb(err)
    })
  })
  ssb.close.hook((close, args) => {
    if (state.isReadyToClose) {
      return setTimeout(() => {
        close(...args)
      }, 150)
    }

    console.log('... (waiting rebuild)')

    const interval = setInterval(
      () => {
        if (state.isReadyToClose) {
          clearInterval(interval)
          close(...args)
          return
        }

        console.log('... (waiting rebuild)')
      },
      100
    )
  })

  return ssb
}
