const { join } = require('path')
const pull = require('pull-stream')
const { box, unboxKey, unboxBody } = require('envelope-js')

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
      register: 'async',
      registerAuthors: 'async',
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
      isReady: false,
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
      init (done) {
        // ensure keystore is re-loaded from disk before continuing
        keystore = KeyStore(join(config.path, 'private2/keystore'), () => {
          // track our current `previous` msg_id (needed for sync boxing)
          pull(
            ssb.createUserStream({ id: ssb.id, reverse: true, limit: 1 }),
            pull.collect((err, msgs) => {
              if (err) throw err
              state.previous = msgs.length
                ? new MsgId(msgs[0].key).toTFK()
                : new MsgId(null).toTFK()

              ssb.post(m => {
                state.previous = new MsgId(m.key).toTFK()
              })

              state.isReady = true
              done()
            })
          )
        })

        // if ssb closes, stop keystore (runs levelDB)
        ssb.close.hook(function (fn, args) {
          keystore.close()
          return fn.apply(this, args)
        })
      },

      key (ciphertext, value) {
        // TODO change this to isBox2 (using is-canonical-base64)
        if (!ciphertext.endsWith('.box2')) return null

        const trial_keys = api.author.keys(value.author)
        if (!trial_keys.length) return null

        const envelope = Buffer.from(ciphertext.replace('.box2', ''), 'base64')
        const feed_id = new FeedId(value.author).toTFK()
        const prev_msg_id = new MsgId(value.previous).toTFK()

        return unboxKey(envelope, feed_id, prev_msg_id, trial_keys)
        // TODO perhaps modify the addUnboxer api to allow some of the work done
        // in this step to be passed on to unboxBody
      },

      value (ciphertext, value, read_key) {
        // TODO change this to is-box2 using is-canonical-base64 ?
        if (!ciphertext.endsWith('.box2')) return null

        const envelope = Buffer.from(ciphertext.replace('.box2', ''), 'base64')

        const feed_id = new FeedId(value.author).toTFK()
        const prev_msg_id = new MsgId(value.previous).toTFK()

        const plaintext = unboxBody(envelope, feed_id, prev_msg_id, read_key)
        if (!plaintext) return

        return JSON.parse(plaintext.toString('utf8'))
      }
    })

    // listen for new key-entrust messages
    //   - use a dummy flume-view to tap into unseen messages
    //   - discovering new keys triggers re-indexes of other views

    const hermes = Method(ssb, keystore, state) // our scutlebutt database helper!

    // TODO put a 'wait' queue around methods which require isReady?
    // (instead of putting setTimout loops!)
    const api = {
      group: {
        register (groupId, info, cb) {
          if (!isCloaked(groupId)) return cb(new Error(`private2.group.register expected a cloaked message id, got ${groupId}`))
          if (!state.isReady) return setTimeout(() => api.group.register(groupId, info, cb), 500)

          keystore.group.add(groupId, info, cb)
        },
        registerAuthors (groupId, authorIds, cb) {
          pull(
            pull.values(authorIds),
            pull.asyncMap((authorId, cb) => keystore.group.addAuthor(groupId, authorId, cb)),
            pull.collect((err) => {
              if (err) cb(err)
              else cb(null, true)
            })
          )
        },
        create (name, cb) {
          if (!state.isReady) return setTimeout(() => api.group.create(name, cb), 500)

          hermes.group.create(name, (err, data) => {
            if (err) return cb(err)

            api.group.register(data.groupId, { name, key: data.groupKey }, (err) => {
              if (err) return cb(err)

              api.group.registerAuthors(data.groupId, [ssb.id], (err) => {
                if (err) return cb(err)
                cb(null, data)
              })
            })
          })
        },
        invite (groupId, authorIds, opts, cb) {
          if (!state.isReady) return setTimeout(() => api.group.invite(groupId, authorIds, opts, cb), 500)
          hermes.group.invite(groupId, authorIds, opts, cb)
        }
        // remove
        // removeAuthors
      },
      author: {
        keys (authorId) {
          return keystore.author.keys(authorId)
        }
      }
    }

    return api
  }
}
