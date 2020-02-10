const { join } = require('path')
const Keychain = require('./keychain')

module.exports = {
  name: 'private2',
  version: require('./package.json').version,
  manifest: {
    group: {
      add: 'async',
      // create: 'async',
      // remove: 'async'
    },
    member: {
      add: 'async',
      // invite: 'async',
      // remove: 'async',
      getKeys: 'async'
    },
  },
  init: (ssb, config) => {
    const keychain = Keychain(join(config.path, 'keychain'))
    // key store can provide these methods
    //   - group.add
    //   - group.remove
    //   - members.add
    //   - members.remove
    //   - getKeys

    // special methods that use key store + publish other things
    //   - group.create
    //   - members.invite

    ssb.close.hook(function (fn, args) {
      keychain.close()
      return fn.apply(this, args)
    })

    /* register the box / unbox */
    ssb.addBoxer((content, recps) => {
      // check the recps to see if this is ma jam!
      //
      // look up correct groupKey from groupId in recps
    })
    ssb.addUnboxer({
      key: function keyBoxKey (ciphertext, value) {
        // change stuff into buffers,
        // load up the trial keys
        // try and access the msg_key
      },
      value: function getBoxBody (ciphertext, msg_key) {
        // get the body
      }
    })


    // listen for new key-entrust messages
    //   - use a dummy flume-view to tap into unseen messages
    //   - discovering new keys triggers re-indexes of other views

    return {
      // methods
    }
  }
}

// TODO:
// - design key-entrust messages
//   - see if box2 can support feedId + groupId type messages
// - figure out how to programmatically trigger re-indexing
//
// TODO (later):
// - design group creation (later)
