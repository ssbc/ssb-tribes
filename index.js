const { join } = require('path')
const Keychain = require('./keychain')
const isCloaked = require('./spec/cloaked/is-cloaked-msg-id')

module.exports = {
  name: 'private2',
  version: require('./package.json').version,
  manifest: {
    group: {
      add: 'async',
      addAuthors: 'async',
      // removeAuthors: 'async'
      // create: 'async',
    },
    author: {
      keys: 'async' // should this even be public?
      // invite: 'async',
    },
  },
  init: (ssb, config) => {
    const keychain = Keychain(join(config.path, 'keychain'))
    ssb.close.hook(function (fn, args) {
      keychain.close()
      console.log('close.hook', fn, args)
      return fn.apply(this, args)
    })

    /* register the boxer / unboxer */
    ssb.addBoxer((content, recps, cb) => {
      if (!recps.every(isCloaked)) return cb(null, null)
      // TODO accept (cloaked | feedId)

      // look up / derive recp_keys

      cb(null, 'doop.box2')
    })
    ssb.addUnboxer({
      key: function unboxKey (ciphertext, value, cb) {
        // change stuff into buffers,
        // load up the trial keys
        // try and access the msg_key
        cb(null, null)
      },
      value: function unboxBody (ciphertext, msg_key, value, cb) {
        // get the body
      }
    })


    // listen for new key-entrust messages
    //   - use a dummy flume-view to tap into unseen messages
    //   - discovering new keys triggers re-indexes of other views

    return {
      group: {
        add: keychain.group.add,
        addAuthors (groupId, authorIds, cb) {
          pull(
            pull.values(authorIds),
            pull.asyncMap((authorId, cb) => keychain.addAuthor(groupId, authorId, cb)),
            pull.collect((err) => {
              if (err) cb(err)
              else cb(null, true)
            })
          )
        },
        // create
        // remove
        // removeAuthors
      },
      author: {
        keys: keychain.author.keys,
        // invite
      }
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
