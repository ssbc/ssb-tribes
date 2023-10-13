const { join } = require('path')
const set = require('lodash.set')
const { isFeed, isCloakedMsg: isGroup } = require('ssb-ref')
const KeyRing = require('ssb-keyring')
const bfe = require('ssb-bfe')
const Obz = require('obz')
const pull = require('pull-stream')
const paraMap = require('pull-paramap')

const Envelope = require('./envelope')
const listen = require('./listen')
const { GetGroupTangle, tanglePrune, groupId: buildGroupId, poBoxKeys } = require('./lib')

const Method = require('./method')
const RebuildManager = require('./rebuild-manager')

module.exports = {
  name: 'tribes',
  version: require('./package.json').version,
  manifest: {
    register: 'async',
    registerAuthors: 'async',
    create: 'async',
    get: 'async',
    list: 'async',

    invite: 'async',
    excludeMembers: 'async',
    listAuthors: 'async',

    link: {
      create: 'async',
      createSubGroupLink: 'async'
    },
    findByFeedId: 'async',
    findSubGroupLinks: 'async',

    subtribe: {
      create: 'async',
      findParentGroupLinks: 'async'
    },

    addPOBox: 'async',
    poBox: {
      create: 'async',
      get: 'async'
    },
    ownKeys: {
      list: 'async'
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
  KeyRing(join(config.path, 'tribes/keystore'), (err, api) => {
    if (err) throw err

    api.signing.addNamed(ssb.keys.id, ssb.keys, (err) => {
      if (err) throw err

      Object.assign(keystore, api) // merging into existing reference
      state.loading.keystore.set(false)
    })
  })
  ssb.close.hook(function (close, args) {
    const next = () => close.apply(this, args)
    onKeystoreReady(() => keystore.close(next))
    state.closed = true // NOTE must be after onKeystoreReady call
  })

  /* register the boxer / unboxer */
  const { boxer, unboxer } = Envelope(keystore, state)
  //ssb.addBoxer({ init: onKeystoreReady, value: boxer })
  //ssb.addUnboxer({ init: onKeystoreReady, ...unboxer })

  function onKeystoreReady (done) {
    if (state.closed === true) return
    if (state.loading.keystore.value === false) return done()

    state.loading.keystore.once(done)
  }

  /* start listeners */
  const rebuildManager = new RebuildManager(ssb)
  const processedNewAuthors = {}

  function processAuthors (groupId, authors, adder, cb) {
    if (processedNewAuthors[groupId] === undefined) processedNewAuthors[groupId] = new Set()

    const newAuthors = authors.reduce((acc, author) => {
      if (!processedNewAuthors[groupId].has(author)) acc.add(author)
      return acc
    }, new Set())
    if (!newAuthors.size) return cb()

    state.newAuthorListeners.forEach(fn => fn({ groupId, newAuthors: [...newAuthors] }))
    // we don't rebuild if we're the person who added them
    if (adder !== ssb.id) {
      const reason = ['add-member', ...newAuthors].join('+')
      rebuildManager.rebuild(reason)
    }
    newAuthors.forEach(author => processedNewAuthors[groupId].add(author))
    cb()
  }

  pull(
    listen.addMember(ssb),
    pull.asyncMap((m, cb) => {
      const { root, groupKey } = m.value.content
      ssb.get({ id: root, meta: true }, (err, groupInitMsg) => {
        if (err) throw err

        const groupId = buildGroupId({ groupInitMsg, groupKey })
        const authors = unique([
          groupInitMsg.value.author,
          m.value.author,
          ...m.value.content.recps.filter(isFeed)
        ])

        const record = keystore.group.get(groupId)
        // if we haven't been in the group since before, register the group
        if (record == null) {
          return keystore.group.add(groupId, { key: groupKey, root }, (err) => {
            if (err) return cb(err)
            processAuthors(groupId, authors, m.value.author, cb)
          })
        } else {
          processAuthors(groupId, authors, m.value.author, cb)
        }
      })
    }),
    pull.drain(() => {}, (err) => {
      if (err) console.error('Listening for new addMembers errored:', err)
    })
  )

  pull(
    listen.excludeMember(ssb),
    pull.drain((msg) => {
      const excludes = msg.value.content.excludes
      const groupId = msg.value.content.recps[0]

      if (excludes.includes(ssb.id)) {
        keystore.group.exclude(groupId)
      }
    }, err => {
      if (err) console.error('Listening for new excludeMembers errored:', err)
    })
  )

  listen.poBox(ssb, m => {
    const { poBoxId, key: poBoxKey } = m.value.content.keys.set
    keystore.poBox.add(poBoxId, { key: poBoxKey }, (err) => {
      if (err) throw err

      const reason = ['po-box', poBoxId].join()
      rebuildManager.rebuild(reason)
    })
  })

  setImmediate(() => {
    if (ssb.replicate) {
      state.newAuthorListeners.push(({ newAuthors }) => {
        newAuthors
          .filter(id => id !== ssb.id)
          .forEach(id => ssb.replicate.request({ id, replicate: true }))
      })

      state.loading.keystore.once(() => {
        pull(
          pull.values(keystore.group.listSync()),
          paraMap(
            (groupId, cb) => scuttle.group.listAuthors(groupId, (err, feedIds) => {
              if (err) return cb(new Error('error listing authors to replicate on start'))
              cb(null, feedIds)
            }),
            5
          ),
          pull.flatten(),
          pull.unique(),
          pull.drain(feedId => {
            if (feedId === ssb.id) return
            ssb.replicate.request({ id: feedId, replicate: true })
          }, (err) => {
            if (err) console.error('error on initializing replication of group members')
          })
        )
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

  const isMemberType = (type) => type === 'group/add-member' || type === 'group/exclude-member'

  /* Tangle: auto-add tangles.group info to all private-group messages */
  const getGroupTangle = GetGroupTangle(ssb, keystore, 'group')
  const getMembersTangle = GetGroupTangle(ssb, keystore, 'members')
  // TODO: make this a ssb.tribes.publish function instead of a hook
  //ssb.publish.hook(function (publish, args) {
  //  const [content, cb] = args
  //  if (!content.recps) return publish.apply(this, args)

  //  if (!isGroup(content.recps[0])) return publish.apply(this, args)

  //  onKeystoreReady(() => {
  //    if (!keystore.group.has(content.recps[0])) return cb(Error('unknown groupId'))

  //    getGroupTangle(content.recps[0], (err, groupTangle) => {
  //      if (err) return cb(Error("Couldn't get group tangle", { cause: err }))

  //      set(content, 'tangles.group', groupTangle)
  //      tanglePrune(content) // prune the group tangle down if needed

  //      // we only want to have to calculate the members tangle if it's gonna be used
  //      if (!isMemberType(content.type)) {
  //        return publish.call(this, content, cb)
  //      }

  //      getMembersTangle(content.recps[0], (err, membersTangle) => {
  //        if (err) return cb(Error("Couldn't get members tangle", { cause: err }))

  //        set(content, 'tangles.members', membersTangle)
  //        tanglePrune(content, 'members')

  //        publish.call(this, content, cb)
  //      })
  //    })
  //  })
  //})

  /* API */
  const scuttle = Method(ssb, keystore, state) // ssb db methods

  const tribeCreate = (opts, cb) => {
    opts = opts || {} // NOTE this catches opts = null, leave it like this
    onKeystoreReady(() => {
      scuttle.group.init((err, data) => {
        if (err) return cb(err)

        // NOTE this checks out group/init message was encrypted with the right `previous`.
        // There is a potential race condition where the init method calls `ssb.getFeedState` to
        // access `previous` but while encrypting the `group/init` message content another
        // message is pushed into the queue, making our enveloping invalid.
        const initValue = data.groupInitMsg.value
        const readKey = unboxer.key(initValue.content, initValue)
        if (!readKey) return cb(new Error('tribes.group.init failed, please try again while not publishing other messages'))

        console.log('about to addMember')
        // addMember the admin
        scuttle.group.addMember(data.groupId, [ssb.id], {}, (err) => {
          if (err) return cb(err)
        console.log('added member')

          // add a P.O. Box to the group (maybe)
          if (!opts.addPOBox) return cb(null, data)
          else {
            scuttle.group.addPOBox(data.groupId, (err, poBoxId) => {
              if (err) cb(err)
              cb(null, { ...data, poBoxId })
            })
          }
        })
      })
    })
  }

  const tribeGet = (id, cb) => {
    onKeystoreReady(() => {
      const data = keystore.group.get(id)
      if (!data) return cb(new Error(`unknown groupId ${id})`))

      scuttle.link.findParentGroupLinks(id, (err, parentGroupLinks) => {
        if (err) return cb(err)

        const groupData = {
          ...data,
          groupId: id
        }
        if (parentGroupLinks.length) {
          groupData.parentGroupId = parentGroupLinks[0].groupId
          // NOTE: here we assume that there can only be one parent group
        }

        cb(null, groupData)
      })
    })
  }

  function tribeList (opts, cb) {
    if (typeof opts === 'function') return tribeList({}, opts)

    onKeystoreReady(() => {
      pull(
        pull.values(keystore.group.listSync()),
        paraMap(tribeGet, 4),
        opts.subtribes
          ? null
          : pull.filter(tribe => tribe.parentGroupId === undefined),
        pull.map(tribe => tribe.groupId),
        pull.collect(cb)
      )
    })
  }

  return {
    publish (content, cb) {
      ssb.db.create({
        content,
        encryptionFormat: 'box2',
      }, cb)
    },
    register (groupId, info, cb) {
      keystore.group.add(groupId, info, cb)
    },
    create: tribeCreate,
    list: tribeList,
    get: tribeGet,

    invite (groupId, authorIds, opts = {}, cb) {
      scuttle.group.addMember(groupId, authorIds, opts, (err, data) => {
        if (err) return cb(err)
        cb(null, data)
      })
    },
    excludeMembers: scuttle.group.excludeMembers,
    listAuthors (groupId, cb) {
      scuttle.group.listAuthors(groupId, cb)
    },

    link: {
      create: scuttle.link.create
    },
    findByFeedId: scuttle.link.findGroupByFeedId,
    findSubGroupLinks: scuttle.link.findSubGroupLinks,

    // NOTE this won't work over RPC
    addNewAuthorListener (fn) {
      state.newAuthorListeners.push(fn)
    },

    subtribe: {
      create (parentGroupId, opts, cb) {
        tribeCreate(opts, (err, data) => {
          if (err) return cb(err)

          const linkOpts = {
            group: parentGroupId,
            subGroup: data.groupId
          }

          if (opts && opts.admin) {
            linkOpts.admin = opts.admin
          }

          // link the subGroup to the group
          scuttle.link.createSubGroupLink(linkOpts, (err, link) => {
            if (err) return cb(err)

            cb(null, { ...data, parentGroupId })
          })
        })
      },
      get: tribeGet,
      findParentGroupLinks: scuttle.link.findParentGroupLinks
    },

    addPOBox: scuttle.group.addPOBox,
    poBox: {
      create (opts, cb) {
        const { id: poBoxId, secret } = poBoxKeys.generate()

        onKeystoreReady(() => {
          keystore.poBox.add(poBoxId, { key: secret }, (err) => {
            if (err) return cb(err)

            cb(null, { poBoxId, poBoxKey: secret })
          })
        })
      },
      get: scuttle.group.getPOBox
    },

    // for internal use - ssb-ahau uses this for backups
    ownKeys: {
      list (cb) {
        onKeystoreReady(() => {
          cb(null, [keystore.self.get()])
        })
      },
      register (key, cb) {
        onKeystoreReady(() => {
          keystore.self.set(key, cb)
        })
      }
    }
  }
}

function unique (array) {
  return Array.from(new Set(array))
}
