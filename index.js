const { join } = require('path')
const pull = require('pull-stream')
const set = require('lodash.set')

const KeyStore = require('./key-store')
const Envelope = require('./envelope')
const listen = require('./listen')
const { FeedId } = require('./lib/cipherlinks')
const isGroupId = require('./lib/is-cloaked-msg-id')
const GetGroupTangle = require('./lib/get-group-tangle')

const Method = require('./method')

module.exports = {
  name: 'private2',
  version: require('./package.json').version,
  manifest: {
    group: {
      register: 'async',
      registerAuthors: 'async',
      // removeAuthors: 'async'
      create: 'async',
      invite: 'async' // TODO
    }
    // author: {
    //   groupKeys: 'sync' // should this even be public?
    // }
  },
  init: (ssb, config) => {
    var state = {
      feedId: new FeedId(ssb.id).toTFK(),
      previous: undefined,

      loading: {
        previous: true,
        keystore: true
      },
      get isReady () {
        return !this.loading.keystore && !this.loading.previous
        // we need both these things completed for:
        // - boxing of new private messages
        // - unboxing of new incoming messages
      }
    }

    /* secret keys store / helper */
    const keystore = KeyStore(join(config.path, 'private2/keystore'), ssb.keys, () => {
      state.loading.keystore = false
    })
    ssb.close.hook(function (fn, args) {
      keystore.close(() => fn.apply(this, args))
    })

    /* start listeners */
    listen.previous(ssb)(prev => {
      state.previous = prev
      if (state.loading.previous) state.loading.previous = false
    })
    // TODO listen for new key-entrust messages
    //   - use a dummy flume-view to tap into unseen messages
    //   - discovering new keys triggers re-indexes of other views


    /* register the boxer / unboxer */
    const { boxer, unboxer } = Envelope(ssb, keystore, state)
    ssb.addBoxer(boxer)
    ssb.addUnboxer({ init: checkReady, ...unboxer })
    function checkReady (done) {
      if (state.isReady) return done()
      setTimeout(() => checkReady(done), 500)
    }

    /* auto-add group tangle info to all private-group messages */
    const getGroupTangle = GetGroupTangle(ssb, keystore)
    ssb.publish.hook(function (fn, args) {
      const [content, cb] = args
      if (!content.recps) return fn.apply(this, args)
      if (!isGroupId(content.recps[0])) return fn.apply(this, args)

      getGroupTangle(content.recps[0], (err, tangle) => {
        if (err) {
          console.warn(err)
          // NOTE there are two ways an err can occur in getGroupTangle, and we don't
          // want to cb(err) with either in this hook. Rather we pass it on to boxers to throw
          return fn.apply(this, args)
        }

        fn.apply(this, [set(content, 'tangles.group', tangle), cb])
      })
    })

    /* API */
    const scuttle = Method(ssb, keystore, state) // ssb db methods
    return {
      group: {
        register: keystore.group.add,
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
        create (opts, cb) {
          scuttle.group.init((err, data) => {
            if (err) return cb(err)

            keystore.group.add(data.groupId, { key: data.groupKey, root: data.groupInitMsg.key }, (err) => {
              if (err) return cb(err)

              keystore.group.addAuthor(data.groupId, ssb.id, (err) => {
                if (err) return cb(err)
                cb(null, data)
              })
            })
          })
        },
        invite: scuttle.group.addMember
      }
    }
  }
}
