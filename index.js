const { join } = require('path')
const set = require('lodash.set')
const { isFeed, isCloakedMsg: isGroup } = require('ssb-ref')
const KeyRing = require('ssb-keyring')
const bfe = require('ssb-bfe')
const Obz = require('obz')

const Envelope = require('./envelope')
const listen = require('./listen')
const { GetGroupTangle, groupId: buildGroupId } = require('./lib')

const Method = require('./method')

module.exports = {
  name: 'tribes',
  version: require('./package.json').version,
  manifest: {
    register: 'async',
    registerAuthors: 'async',
    create: 'async',
    invite: 'async',
    get: 'async',
    list: 'async',
    listAuthors: 'async',
    link: {
      create: 'async'
    },
    findByFeedId: 'async',

    application: {
      create: 'async ',
      get: 'async',
      comment: 'async',
      accept: 'async',
      reject: 'async',
      update: 'async',
      list: 'async,'
    },
    poBox: {
      create: 'async'
    }
  },
  init
}

function init (ssb, config) {
  const state = {
    keys: ssb.keys,
    feedId: bfe.encode(ssb.id),

    loading: {
      keystore: Obz()
    },
    newAuthorListeners: [],

    closed: false
  }

  /* secret keys store / helper */
  const keystore = {} // HACK we create an Object so we have a reference to merge into
  KeyRing(join(config.path, 'tribes/keystore'), ssb.keys, (err, api) => {
    if (err) throw err
    Object.assign(keystore, api) // merging into existing reference
    state.loading.keystore.set(false)
  })
  ssb.close.hook(function (fn, args) {
    state.closed = true
    keystore.close(() => fn.apply(this, args))
  })

  /* register the boxer / unboxer */
  const { boxer, unboxer } = Envelope(keystore, state)
  ssb.addBoxer({ init: onKeystoreReady, value: boxer })
  ssb.addUnboxer({ init: onKeystoreReady, ...unboxer })

  function onKeystoreReady (done) {
    if (state.closed === true) return
    if (state.loading.keystore.value === false) return done()

    state.loading.keystore.once(done)
  }

  /* start listeners */
  listen.addMember(ssb, m => {
    const { root, groupKey } = m.value.content
    ssb.get({ id: root, meta: true }, (err, groupInitMsg) => {
      if (err) throw err

      const groupId = buildGroupId({ groupInitMsg, groupKey })
      const authors = [
        m.value.author,
        ...m.value.content.recps.filter(isFeed)
      ]

      keystore.processAddMember({ groupId, groupKey, root, authors }, (err, newAuthors) => {
        if (err) throw err
        if (newAuthors.length) {
          state.newAuthorListeners.forEach(fn => fn({ groupId, newAuthors }))

          console.log('rebuild!!!   (ﾉ´ヮ´)ﾉ*:･ﾟ✧')
          ssb.rebuild(() => console.log('rebuild finished'))
        }
      })
    })
  })

  setImmediate(() => {
    if (ssb.replicate) {
      state.newAuthorListeners.push(({ newAuthors }) => {
        newAuthors
          .filter(id => id !== ssb.id)
          .forEach(id => ssb.replicate.request({ id, replicate: true }))
      })

      state.loading.keystore.once((s) => {
        const peers = new Set()
        keystore.group.list()
          .map(groupId => keystore.group.listAuthors(groupId))
          .forEach(authors => authors.forEach(author => peers.add(author)))

        peers.delete(ssb.id)
        Array.from(peers)
          .forEach(id => ssb.replicate.request({ id, replicate: true }))
      })
    }
  })

  /* We care about group/add-member messages others have posted which:
   * 1. add us to a new group
   * 2. add other people to a group we're already in
   *
   * In (2) we may be able to skip re-indexing if they haven't published
   * any brand new private messages since they were added.
   * This would require knowing their feed seq at time they were entrusted with key
   * (because they can't post messages to the group before then)
   */

  /* Tangle: auto-add tangles.group info to all private-group messages */
  const getGroupTangle = GetGroupTangle(ssb, keystore)
  ssb.publish.hook(function (fn, args) {
    const [content, cb] = args
    if (!content.recps) return fn.apply(this, args)

    // NOTE there are two ways an err can occur in getGroupTangle
    // 1. recps is not a groupId
    // 2. unknown groupId,
    // Rather than cb(err) here we we pass it on to boxers to see if an err is needed

    if (!isGroup(content.recps[0])) return fn.apply(this, args)

    onKeystoreReady(() => {
      getGroupTangle(content.recps[0], (err, tangle) => {
        if (err) return fn.apply(this, args)

        fn.apply(this, [set(content, 'tangles.group', tangle), cb])
      })
    })
  })

  /* API */
  const scuttle = Method(ssb, keystore, state) // ssb db methods

  const createGroup = function create (opts, cb) {
    scuttle.group.init((err, data) => {
      if (err) return cb(err)

      const { groupId, groupKey, groupInitMsg: root } = data

      keystore.group.register(groupId, { key: groupKey, root: root.key }, (err) => {
        if (err) return cb(err)

        keystore.group.registerAuthor(groupId, ssb.id, (err) => {
          if (err) return cb(err)

          const readKey = unboxer.key(root.value.content, root.value)
          if (!readKey) return cb(new Error('tribes.group.init failed, please try again while not publishing other messages'))
          // NOTE this checks out group/init message was encrypted with the right `previous`.
          // There is a potential race condition where the init method calls `ssb.getFeedState` to
          // access `previous` but while encrypting the `group/init` message content another
          // message is pushed into the queue, making our enveloping invalid.

          state.newAuthorListeners.forEach(fn => fn({ groupId, newAuthors: [ssb.id] }))

          cb(null, data)
        })
      })
    })
  }

  return {
    register (groupId, info, cb) {
      keystore.group.register(groupId, info, cb)
    },
    registerAuthors (groupId, authors, cb) {
      keystore.group.registerAuthors(groupId, authors, (err) => err ? cb(err) : cb(null, true))
    },
    create: createGroup,
    invite (groupId, authorIds, opts = {}, cb) {
      scuttle.group.addMember(groupId, authorIds, opts, (err, data) => {
        if (err) return cb(err)
        keystore.group.registerAuthors(groupId, authorIds, (err) => {
          if (err) return cb(err)
          cb(null, data)
        })
      })
    },
    list (cb) {
      onKeystoreReady(() => cb(null, keystore.group.list()))
    },
    get (id, cb) {
      onKeystoreReady(() => {
        const data = keystore.group.get(id)
        if (!data) return cb(new Error(`unknown groupId ${id})`))

        cb(null, data)
      })
    },
    listAuthors (groupId, cb) {
      onKeystoreReady(() => cb(null, keystore.group.listAuthors(groupId)))
    },
    link: {
      create: scuttle.link.create
    },
    findByFeedId: scuttle.link.findGroupByFeedId,
    addNewAuthorListener (fn) {
      state.newAuthorListeners.push(fn)
    },

    application: scuttle.application,
    poBox: scuttle.poBox,
    subtribes: {
      create (groupId, opts, cb) {
        // create a new group
        createGroup({}, (data) => {
          const { groupId, groupKey, groupInitMsg } = data

          cb(null, {
            groupId,
            groupKey,
            dmKey: null, // TODO: add code to create the dmKey
            groupInitMsg
          })
        })
      }
    }
  }
}
