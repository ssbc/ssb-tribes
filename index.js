const { join } = require('path')
const pull = require('pull-stream')
const { box, unbox } = require('@envelope/js')

const KeyStore = require('./key-store')
const { FeedId, MsgId } = require('./lib/cipherlinks')
const SecretKey = require('./lib/secret-key')
const isCloaked = require('./lib/is-cloaked-msg-id')

const Method = require('./method')

module.exports = {
  name: 'private2',
  version: require('./package.json').version,
  manifest: {
    group: {
      add: 'async',
      addAuthors: 'async',
      // removeAuthors: 'async'
      create: 'async'
    },
    author: {
      keys: 'sync' // should this even be public?
      // invite: 'async',
    }
  },
  init: (ssb, config) => {
    var keystore
    var state = {
      feedId: new FeedId(ssb.id).toTFK(),
      previous: undefined
    }

    /* register the boxer / unboxer */
    ssb.addBoxer((content, recps) => {
      if (!recps.every(isCloaked)) return null
      // TODO accept (cloaked | feedId) - ready after DM spec

      const plaintext = Buffer.from(JSON.stringify(content), 'utf8')
      const msgKey = new SecretKey().toBuffer()

      const recipentKeys = recps.map(r => keystore.group.get(r))

      const envelope = box(plaintext, state.feedId, state.previous, msgKey, recipentKeys)
      return envelope.toString('base64') + '.box2'
    })
    ssb.addUnboxer({
      init: function (done) {
        keystore = KeyStore(join(config.path, 'private2/keystore'), () => {

          // we need to know our currrent `previous` because boxing is synchronous!
          pull(
            ssb.createUserStream({ id: ssb.id, reverse: true, limit: 1 }),
            pull.collect((err, msgs) => {
              state.previous = msgs.length
                ? new MsgId(msgs[0].key).toTFK()
                : new MsgId(null).toTFK()

              ssb.post(m => {
                state.previous = new MsgId(m.key).toTFK()
              })

              done()
            })
          )
        })
        // close levelDB if ssb closes
        ssb.close.hook(function (fn, args) {
          keystore.close()
          return fn.apply(this, args)
        })
      },
      key: function unboxKey (ciphertext, value) {
        if (!ciphertext.endsWith('.box2')) return null
        // change stuff into buffers,
        // load up the trial keys (from memory)
        // try and access the msg_key
        return
      },
      value: function unboxBody (ciphertext, msg_key) {
        // get the body
        return {
          type: 'doop',
          text: 'your order here!'
        }
      }
    })

    // listen for change in current feed
    ssb.post(msg => {
      if (msg.value.author === state.feedId) {
        state.previous = msg.value.previous
      }
    })

    // listen for new key-entrust messages
    //   - use a dummy flume-view to tap into unseen messages
    //   - discovering new keys triggers re-indexes of other views

    const hermes = Method(ssb) // our database helper!

    const api = {
      group: {
        add (groupId, info, cb) {
          if (!isCloaked(groupId)) return cb(new Error(`private2.group.add expected a cloaked message id, got ${groupId}`))

          keystore.group.add(groupId, info, cb)
        },
        addAuthors (groupId, authorIds, cb) {
          pull(
            pull.values(authorIds),
            pull.asyncMap((authorId, cb) => keystore.addAuthor(groupId, authorId, cb)),
            pull.collect((err) => {
              if (err) cb(err)
              else cb(null, true)
            })
          )
        },
        create (name, cb) {
          hermes.group.create(state.previous, name, (err, data) => {
            if (err) return cb(err)

            // add this to keystore
            console.log(data)
            cb(null, data)
          })
        }
        // remove
        // removeAuthors
      },
      author: {
        keys (authorId) {
          return keystore.author.keys(authorId)
        },
        // invite
      }
    }

    return api
  }
}
