const { mkdirSync } = require('fs')
const level = require('level')
const charwise = require('charwise')
const pull = require('pull-stream')
const { read }  = require('pull-level')
const KEY_LENGTH = require('sodium-native').crypto_secretbox_KEYBYTES

const GROUP = 'group'
const MEMBER = 'member'

module.exports = function Keychain (path) {
  mkdirSync(path, { recursive: true })

  const db = level(path, { valueEncoding: charwise })

  const group = {
    add (groupId, groupKey, cb) {
      var key
      try { key = toKeyBuffer(groupKey) }
      catch (e) { return cb(e) }

      db.put([GROUP, groupId, Date.now()], toKeyString(key), cb)
    },
    addAuthor (groupId, authorId, cb) {
      db.put([MEMBER, authorId, groupId], groupId, cb)
    },
    list (cb) {
      pull(
        read(db, {
          lt: [GROUP + '~', undefined, undefined], // "group~" is just above "group" in charwise sort
          gt: [GROUP, null, null]
        }),
        pull.map(({ key, value }) => {
          var groupId = key.split(',')[1]
          return { [groupId]: toKeyBuffer(value) }
        }),
        pull.collect((err, pairs) => {
          if (err) return cb(err)
          cb(null, Object.assign(...pairs))
        })
      )
    },
    key (groupId, cb) {
      pull(
        read(db, {
          lt: [GROUP, groupId + '~', undefined], // "group~" is just above "group" in charwise sort
          gt: [GROUP, groupId, null]
        }),
        pull.map(({ value }) => value),
        pull.take(1),
        pull.collect((err, keys) => {
          if (err) return cb(err)
          cb(null, toKeyBuffer(keys[0]))
        })
      )
    }
  }

  function authorGroups (authorId, cb) {
    pull(
      read(db, {
        lt: [MEMBER, authorId + '~', undefined],
        gt: [MEMBER, authorId, null]
      }),
      pull.map(({ value }) => value),
      pull.collect((err, keys) => {
        if (err) return cb(err)
        cb(null, keys)
      })
    )
  }

  function authorKeys (authorId, cb) {
    pull(
      read(db, {
        lt: [MEMBER, authorId + '~', undefined],
        gt: [MEMBER, authorId, null]
      }),
      pull.map(({ value }) => value),
      pull.asyncMap(group.key),
      pull.collect((err, keys) => {
        if (err) return cb(err)
        cb(null, keys)
      })
    )
  }

  return {
    group,
    author: {
      groups: authorGroups,
      keys: authorKeys
    },
    close: db.close.bind(db)
  }
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
