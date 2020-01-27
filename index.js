const KeyStore = require('./key-store')

module.exports = {
  name: 'private2',
  version: require('./package.json').version,
  manifest: {
    keys: {
      add: 'async',
      list: 'async',
      remove: 'async'
    }
  },
  init: (ssb, config) => {

    return {
      keys: KeyStore(ssb, config)
    }
  }
}
