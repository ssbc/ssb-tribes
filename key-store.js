const mkdirp = require('mkdirp')
const Level = require('level')
const charwise = require('charwise')
const pull = require('pull-stream')
const { read } = require('pull-level')
const KEY_LENGTH = require('sodium-native').crypto_secretbox_KEYBYTES
const { keySchemes } = require('private-group-spec')
const { isFeed, isMsg, isCloakedMsg: isGroup } = require('ssb-ref')

const directMessageKey = require('./lib/direct-message-key')
const SecretKey = require('./lib/secret-key')

const GROUP = 'group'
const MEMBER = 'member'
const OWN = 'own_key'

// TODO add requirement for all group.add to have: { key, scheme } ?
// at the moment we're assuming all scheme are for private groups but that might change

module.exports = function Keychain (path, ssbKeys, onReady = noop, opts = {}) {
  const {
    loadState = true
  } = opts

  const buildDMKey = directMessageKey.easy(ssbKeys)

  mkdirp.sync(path)

  /* state */
  var isReady = !loadState
  var cache = {
    groups: {}, // ------ maps groupId > group.info
    memberships: {}, // - maps authorId > [groupId]
    authors: {}, // ----- maps authorId > { key, scheme: SharedDMKey } for that author
    ownKeys: []
  }

  const level = Level(path, {
    keyEncoding: charwise,
    valueEncoding: InfoEncoding()
  })

  /* GROUP - methods about group data */
  const group = {
    register (groupId, info, cb) {
      if (cache.groups[groupId]) return cb(new Error(`key-store already contains group ${groupId}, cannot register twice`))
      // TODO more nuance - don't bother with error if the info is the same?

      if (!isGroup(groupId)) return cb(new Error(`key-store expected a groupId, got ${groupId}`))

      // convert to 32 Byte buffer
      try { info.key = toKeyBuffer(info.key) } catch (e) { return cb(e) }
      // TODO perhaps use groupKey when inputing everywhere
      // and map to trial_keys style { key, scheme } on exit

      if (!isMsg(info.root)) return cb(new Error(`key-store expects root got ${info.root}`))

      if (!info.scheme) info.scheme = keySchemes.private_group

      cache.groups[groupId] = info
      level.put([GROUP, groupId, Date.now()], info, cb)
    },
    get (groupId) {
      return cache.groups[groupId]
    },
    list () {
      return Object.keys(cache.groups)
    },
    readPersisted (cb) {
      pull(
        read(level, {
          lt: [GROUP + '~', undefined, undefined], // "group~" is just above "group" in charwise sort
          gt: [GROUP, null, null]
        }),
        pull.map(({ key, value: info }) => {
          const [_, groupId, createdAt] = key // eslint-disable-line
          return { [groupId]: info }
        }),
        pull.collect((err, pairs) => {
          if (err) return cb(err)
          cb(null, Object.assign({}, ...pairs))
        })
      )
    }
  }

  /* MEMBERSHIP - methods which store a joins of group + author */
  const membership = {
    register (groupId, authorId, cb) {
      if (!isFeed(authorId)) return cb(new Error(`key-store to add authors by feedId, got ${authorId}`))
      if (!cache.memberships[authorId]) cache.memberships[authorId] = new Set()

      cache.memberships[authorId].add(groupId)
      level.put([MEMBER, authorId, groupId], groupId, cb)
    },
    registerMany (groupId, authorIdArray, cb) {
      pull(
        pull.values(authorIdArray),
        pull.asyncMap((authorId, cb) => {
          membership.register(groupId, authorId, cb)
        }),
        pull.collect((err, arr) => {
          cb(err)
        })
      )
    },
    getAuthorGroups (authorId) {
      return Array.from(cache.memberships[authorId] || [])
    },

    readPersisted (cb) {
      pull(
        read(level, {
          lt: [MEMBER + '~', undefined, undefined], // "member~" is just above "member" in charwise sort
          gt: [MEMBER, null, null]
        }),
        pull.map(({ key, value: groupId }) => {
          const [_, authorId] = key // eslint-disable-line
          return { authorId, groupId }
        }),
        pull.collect((err, pairs) => {
          if (err) return cb(err)

          const list = pairs.reduce((acc, { authorId, groupId }) => {
            if (!acc[authorId]) acc[authorId] = new Set()

            acc[authorId].add(groupId)
            return acc
          }, {})

          cb(null, list)
        })
      )
    }
  }

  /* OWN KEY - methods for getting your key for encryption to self in DMs */
  const ownKey = {
    create (cb) {
      const key = new SecretKey().toBuffer()

      cache.ownKeys = [...cache.ownKeys, key]
      level.put([OWN, ssbKeys.id, Date.now()], { key }, cb)
    },
    readPersisted (cb) {
      pull(
        read(level, {
          lt: [OWN + '~', undefined, undefined], // "own~" is just above "own" in charwise sort
          gt: [OWN, null, null]
        }),
        pull.map(({ key, value }) => value.key),
        pull.collect((err, keys) => {
          if (err) return cb(err)

          cb(null, keys)
        })
      )
    }
  }

  /* META methods - span GROUP/ MEMBERSHIP */
  function getAuthorGroupKeys (authorId) {
    return membership.getAuthorGroups(authorId)
      .map(groupId => {
        const info = group.get(groupId)
        if (!info) throw new Error(`unknown group ${groupId}`)

        return info
      })
  }

  function getSharedDMKey (authorId) {
    if (!cache.authors[authorId]) {
      cache.authors[authorId] = buildDMKey(authorId)
    }

    return {
      key: cache.authors[authorId],
      scheme: keySchemes.feed_id_dm
    }
  }

  function processAddMember ({ groupId, groupKey, root, authors }, cb) {
    const thisGroup = group.get(groupId)

    if (thisGroup == null) {
      const info = { key: groupKey, root }
      return group.register(groupId, info, (err) => {
        if (err) return cb(err)

        membership.registerMany(groupId, authors, (err) => {
          if (err) return cb(err)
          cb(null, authors)
        })
      })
    }

    if (!isSameKey(thisGroup.key, groupKey)) {
      // we see this is comparing a string + Buffer!
      // because during persistence we map key > Buffer
      return cb(new Error(`key-store: groupId ${groupId} already registered with a different groupKey`))
    }
    if (thisGroup.root !== root) {
      return cb(new Error(`key-store: groupId ${groupId} already registered with a different root`))
    }

    const authorsNotInGroup = authors
      .filter((author) => {
        return !membership
          .getAuthorGroups(author)
          .includes(groupId)
      })
    membership.registerMany(groupId, authorsNotInGroup, (err) => {
      if (err) return cb(err)
      cb(null, authorsNotInGroup)
    })
  }

  /* LOAD STATE - loads persisted states into cache */
  if (loadState) {
    group.readPersisted((err, groups) => {
      if (err) throw err
      cache.groups = groups

      membership.readPersisted((err, memberships) => {
        if (err) throw err
        cache.memberships = memberships

        isReady = true
        onReady()
      })
    })
  }

  /* API */
  return {
    group: {
      register: patient(group.register),
      get: group.get, // ------------------------------------ sync
      list: group.list, // ---------------------------------- sync
      registerAuthor: patient(membership.register),
      // registerAuthors: patient(membership.registerMany),
      readPersisted: group.readPersisted
    },
    author: {
      groups: membership.getAuthorGroups, // ---------------- sync
      groupKeys: getAuthorGroupKeys, // --------------------- sync (ssb-db boxer/unboxer requires sync)
      sharedDMKey: getSharedDMKey // ------------------------ sync
    },
    processAddMember: patient(processAddMember),
    ownKeys () { // ----------------------------------------- sync
      if (!cache.ownKeys.length) {
        ownKey.create((err) => {
          if (err) throw err
        })
      }

      if (!cache.ownKeys.length) {
        throw new Error('key-store failed to provide ownKeys')
      }

      return cache.ownKeys.map(key => {
        return { key, scheme: keySchemes.feed_id_self }
      })
    },
    close: level.close.bind(level)
  }

  function patient (fn) {
    // this can be improved later
    return function (...args) {
      if (!isReady) return setTimeout(() => fn.apply(null, args), 500)

      fn.apply(null, args)
    }
  }
}

function InfoEncoding () {
  return {
    encode (obj) {
      if (!obj.key) return JSON.stringify(obj)

      return JSON.stringify({
        ...obj,
        key: obj.key.toString('base64')
      })
    },
    decode (str) {
      var info = JSON.parse(str)
      if (info.key) info.key = toKeyBuffer(info.key)

      return info
    },
    buffer: false,
    type: 'keystore-info-encoding'
  }
}

function toKeyBuffer (thing) {
  const buf = Buffer.isBuffer(thing)
    ? thing
    : Buffer.from(thing, 'base64')

  if (buf.length !== KEY_LENGTH) throw new Error(`invalid groupKey, expected ${KEY_LENGTH} Bytes, got ${buf.length}`)
  return buf
}

function isSameKey (A, B) {
  return toKeyBuffer(A).compare(toKeyBuffer(B)) === 0
}

function noop () {}
