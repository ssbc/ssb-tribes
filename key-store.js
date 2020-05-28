const { mkdirSync } = require('fs')
const level = require('level')
const charwise = require('charwise')
const pull = require('pull-stream')
const { read } = require('pull-level')
const KEY_LENGTH = require('sodium-native').crypto_secretbox_KEYBYTES
const SCHEMES = require('private-group-spec/key-schemes.json').scheme

const directMessageKey = require('./lib/direct-message-key')
const { FeedId } = require('./lib/cipherlinks')

const GROUP = 'group'
const MEMBER = 'member'

// TODO add requirement for all group.add to have: { key, scheme } ?
// at the moment we're assuming all scheme are for private groups but that might change

module.exports = function Keychain (path, ssbKeys, onReady = noop, opts = {}) {
  const {
    loadState = true
  } = opts

  const buildDMKey = BuildDMKey(ssbKeys)

  mkdirSync(path, { recursive: true })

  /* state */
  var isReady = !loadState
  var cache = {
    groups: {},      // maps groupId > group.info
    memberships: {}, // maps authorId > [groupId]
    authors: {}      // maps authorId > { key, scheme: SharedDMKey } for that author
  }

  const db = level(path, { valueEncoding: charwise })

  const group = {
    add (groupId, info, cb) {
      // checks key is right shape (can be converted to a 32 Byte buffer)
      try { info.key = toKeyBuffer(info.key) }
      catch (e) { return cb(e) }

      if (!info.scheme) info.scheme = SCHEMES.private_group

      if (!isReady) return setTimeout(() => group.add(groupId, info, cb), 500)

      if (cache.groups[groupId]) return cb(new Error(`key-store already constains group ${groupId}, cannot add twice`))
      // TODO more nuance - don't bother with error if the info is the same?


      cache.groups[groupId] = info
      db.put(
        [GROUP, groupId, Date.now()],
        JSON.stringify(Object.assign({}, info, { key: toKeyString(info.key) })),
        cb
      )
    },
    list (cb) {
      pull(
        read(db, {
          lt: [GROUP + '~', undefined, undefined], // "group~" is just above "group" in charwise sort
          gt: [GROUP, null, null]
        }),
        pull.map(({ key, value: info }) => {
          var groupId = key.split(',')[1]
          return { [groupId]: hydrate(info) }
        }),
        pull.collect((err, pairs) => {
          if (err) return cb(err)

          cb(null, Object.assign({}, ...pairs))
        })
      )
    },
    get (groupId) {
      return cache.groups[groupId]
    }
  }

  const membership = {
    add (groupId, authorId, cb) {
      if (!isReady) return setTimeout(() => membership.add(groupId, authorId, cb), 500)

      if (!cache.memberships[authorId]) cache.memberships[authorId] = new Set()

      cache.memberships[authorId].add(groupId)
      db.put([MEMBER, authorId, groupId], groupId, cb)
    },
    list (cb) {
      pull(
        read(db, {
          lt: [MEMBER + '~', undefined, undefined], // "member~" is just above "member" in charwise sort
          gt: [MEMBER, null, null]
        }),
        pull.map(({ key, value: groupId }) => {
          var authorId = key.split(',')[1]
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
    },
    getAuthorGroups (authorId) {
      return Array.from(cache.memberships[authorId] || [])
    }
  }

  function getAuthorKeys (authorId) {
    return membership.getAuthorGroups(authorId)
      .map(group.get)
  }

  function getSharedKey (authorId) {
    if (!cache.authors[authorId]) {
      cache.authors[authorId] = buildDMKey(new FeedId(authorId).toBuffer())
    }

    return {
      key: cache.authors[authorId],
      scheme: SCHEMES.feed_id_dm
    }
  }

  /* load persisted state into cache */
  if (loadState) {
    group.list((err, groups) => {
      if (err) throw err
      cache.groups = groups

      membership.list((err, memberships) => {
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
      ...group,
      addAuthor: membership.add
    },
    author: {
      groups: membership.getAuthorGroups,
      keys: getAuthorKeys,
      getSharedKey
    },
    close: db.close.bind(db)
  }
}

function BuildDMKey (ssbKeys) {
  if (!ssbKeys.private) throw new Error('key-store requires ssbKeys.private')

  const mySk = Buffer.from(
    ssbKeys.private.replace('.ed25519', ''),
    'base64'
  )

  return directMessageKey(mySk)
}

function toKeyBuffer (thing) {
  const buf = Buffer.isBuffer(thing)
    ? thing
    : Buffer.from(thing, 'base64')

  if (buf.length !== KEY_LENGTH) throw new Error(`invalid groupKey, expected ${KEY_LENGTH} Bytes, got ${buf.length}`)
  return buf
}

function toKeyString (buf) {
  return buf.toString('base64')
}

function hydrate (info) {
  var i = JSON.parse(info)

  return { ...i, key: toKeyBuffer(i.key) }
}

function noop () {}
