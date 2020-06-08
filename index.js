const { join } = require('path')
const pull = require('pull-stream')
const set = require('lodash.set')

const KeyStore = require('./key-store')
const Envelope = require('./envelope')
const { FeedId, MsgId } = require('./lib/cipherlinks')
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
    },
    author: {
      // groupKeys: 'sync' // should this even be public?
    }
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

    /* load the keystore for tracking group keys */
    const keystore = KeyStore(join(config.path, 'private2/keystore'), ssb.keys, () => {
      state.loading.keystore = false
    })
    ssb.close.hook(function (fn, args) {
      keystore.close()
      return fn.apply(this, args)
    })

    /* automatically add group tangle info to all private-group messages */
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

    /* track our most recent msg key - "previous"` - for boxer */
    ssb.post(m => {
      state.previous = new MsgId(m.key).toTFK()
    })
    pull(
      // TODO - research best source, is this an index or raw log?
      ssb.createUserStream({ id: ssb.id, reverse: true, limit: 1 }),
      pull.collect((err, msgs) => {
        if (err) throw err

        if (!state.previous) { // in case it's already been set by listener above
          state.previous = msgs.length
            ? new MsgId(msgs[0].key).toTFK()
            : new MsgId(null).toTFK()
        }
        state.loading.previous = false
      })
    )

    /* register the boxer / unboxer */
    const { boxer, unboxer } = Envelope(ssb, keystore, state)
    ssb.addBoxer(boxer)
    ssb.addUnboxer({ init: checkReady, ...unboxer })
    function checkReady (done) {
      if (state.isReady) done()
      else setTimeout(() => checkReady(done), 500)
    }

    // TODO listen for new key-entrust messages
    //   - use a dummy flume-view to tap into unseen messages
    //   - discovering new keys triggers re-indexes of other views

    const scuttle = Method(ssb, keystore, state) // ssb db methods

    // TODO put a 'wait' queue around methods which require isReady?
    // (instead of putting setTimout loops!)
    const api = {
      group: {
        register (groupId, info, cb) {
          if (!isGroupId(groupId)) return cb(new Error(`private2.group.register expected a cloaked message id, got ${groupId}`))
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
        create (opts, cb) {
          // opts currently unused
          if (!state.isReady) return setTimeout(() => api.group.create(opts, cb), 500)

          scuttle.group.init((err, data) => {
            if (err) return cb(err)

            api.group.register(data.groupId, { key: data.groupKey, root: data.groupInitMsg.key }, (err) => {
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
          scuttle.group.addMember(groupId, authorIds, opts, cb)
        }
        // remove
        // removeAuthors
      },
      author: {
        // invite
      }
    }

    return api
  }
}
