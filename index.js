const fs = require('fs')
const set = require('lodash.set')
const { isFeed, isCloakedMsg: isGroup } = require('ssb-ref')
const bfe = require('ssb-bfe')
const pull = require('pull-stream')
const paraMap = require('pull-paramap')

const listen = require('./listen')
const { GetGroupTangle, tanglePrune, groupId: buildGroupId, poBoxKeys } = require('./lib')

const Method = require('./method')
const { join } = require('path')

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
  if (!(config.box2 && config.box2.legacyMode)) throw Error('ssb-tribes error: config.box2.legacyMode needs to be `true`')

  // where old versions of ssb-tribes used to store the keyring. now we use ssb-box2 (which uses keyring internally) which defaults to a different location. if we detect that there's something at the old path we need to prompt the user to config ssb-box2 differently
  const oldKeyringPathExists = fs.existsSync(join(config.path, 'tribes/keystore'))
  const box2PathPointsToOldLocation = (config.box2 && config.box2.path) === 'tribes/keystore'
  if (oldKeyringPathExists && !box2PathPointsToOldLocation) throw Error('ssb-tribes found an old keystore at SSB_PATH/tribes/keystore but ssb-box2 is not configured to use it. Please set config.box2.path = "tribes/keystore"')

  const state = {
    keys: ssb.keys,
    feedId: bfe.encode(ssb.id),

    newAuthorListeners: [],

    closed: false
  }

  ssb.close.hook(function (close, args) {
    state.closed = true
    close.apply(this, args)
  })

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
      ssb.db.reindexEncrypted((err) => {
        if (err) console.error('error reindexing encrypted after new members found', err)
      })
    }
    newAuthors.forEach(author => processedNewAuthors[groupId].add(author))
    cb()
  }

  /* start listeners */

  /* We care about group/add-member messages others have posted which:
   * 1. add us to a new group
   * 2. add other people to a group we're already in
   *
   * In (2) we may be able to skip re-indexing if they haven't published
   * any brand new private messages since they were added.
   * This would require knowing their feed seq at time they were entrusted with key
   * (because they can't post messages to the group before then)
   */

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

        ssb.box2.getGroupInfo(groupId, (err, record) => {
          if (err) return cb(Error("Couldn't get group info when add-member msg was found", { cause: err }))

          // if we haven't been in the group since before, register the group
          if (record == null) {
            return ssb.box2.addGroupInfo(groupId, { key: groupKey, root }, (err) => {
              if (err) return cb(err)
              processAuthors(groupId, authors, m.value.author, cb)
            })
          } else {
            processAuthors(groupId, authors, m.value.author, cb)
          }
        })
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
        ssb.box2.excludeGroupInfo(groupId)
      }
    }, err => {
      if (err) console.error('Listening for new excludeMembers errored:', err)
    })
  )

  listen.poBox(ssb, m => {
    const { poBoxId, key: poBoxKey } = m.value.content.keys.set
    ssb.box2.addPoBox(poBoxId, { key: poBoxKey }, (err) => {
      if (err) throw err

      ssb.db.reindexEncrypted((err) => {
        if (err) console.error('error reindexing encrypted after pobox found', err)
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

      pull(
        ssb.box2.listGroupIds(),
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
    }
  })

  /* API */

  const isMemberType = (type) => type === 'group/add-member' || type === 'group/exclude-member'

  /* Tangle: auto-add tangles.group info to all private-group messages */
  const getGroupTangle = GetGroupTangle(ssb, null, 'group')
  const getMembersTangle = GetGroupTangle(ssb, null, 'members')

  function tribesPublish (content, cb) {
    if (!content.recps) return cb(Error('tribes.publish requires content.recps'))

    if (!isGroup(content.recps[0])) {
      return ssb.db.create({
        content,
        encryptionFormat: 'box2'
      }, cb)
    }

    ssb.box2.getGroupInfo(content.recps[0], (err, groupInfo) => {
      if (err) return cb(Error('error on getting group info in publish', { cause: err }))

      if (!groupInfo) return cb(Error('unknown groupId'))

      getGroupTangle(content.recps[0], (err, groupTangle) => {
        if (err) return cb(Error("Couldn't get group tangle", { cause: err }))

        set(content, 'tangles.group', groupTangle)
        tanglePrune(content) // prune the group tangle down if needed

        // we only want to have to calculate the members tangle if it's gonna be used
        if (!isMemberType(content.type)) {
          return ssb.db.create({
            content,
            encryptionFormat: 'box2'
          }, cb)
        }

        getMembersTangle(content.recps[0], (err, membersTangle) => {
          if (err) return cb(Error("Couldn't get members tangle", { cause: err }))

          set(content, 'tangles.members', membersTangle)
          tanglePrune(content, 'members')

          ssb.db.create({
            content,
            encryptionFormat: 'box2'
          }, cb)
        })
      })
    })
  }

  const scuttle = Method(ssb) // ssb db methods

  const tribeCreate = (opts, cb) => {
    opts = opts || {} // NOTE this catches opts = null, leave it like this

    scuttle.group.init((err, data) => {
      if (err) return cb(err)

      // addMember the admin
      scuttle.group.addMember(data.groupId, [ssb.id], {}, (err) => {
        if (err) return cb(err)

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
  }

  const tribeGet = (id, cb) => {
    ssb.box2.getGroupInfo(id, (err, data) => {
      if (err) return cb(err)
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

    pull(
      ssb.box2.listGroupIds(),
      paraMap(tribeGet, 4),
      opts.subtribes
        ? null
        : pull.filter(tribe => tribe.parentGroupId === undefined),
      pull.map(tribe => tribe.groupId),
      pull.collect(cb)
    )
  }

  return {
    publish: tribesPublish,
    register (groupId, info, cb) {
      ssb.box2.addGroupInfo(groupId, info, cb)
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

        ssb.box2.addPoBox(poBoxId, { key: secret }, (err) => {
          if (err) return cb(err)

          cb(null, { poBoxId, poBoxKey: secret })
        })
      },
      get: scuttle.group.getPOBox
    },

    // for internal use - ssb-ahau uses this for backups
    ownKeys: {
      list (cb) {
        ssb.box2.getOwnDMKey((err, dmKeyInfo) => {
          if (err) return cb(Error("Couldn't get own dm key on ownKeys.list", { cause: err }))
          return cb(null, [dmKeyInfo])
        })
      },
      register (key) {
        ssb.box2.setOwnDMKey(key)
      }
    }
  }
}

function unique (array) {
  return Array.from(new Set(array))
}
