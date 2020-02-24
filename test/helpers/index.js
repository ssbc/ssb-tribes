const na = require('sodium-native')
const { FeedId, MsgId } = require('../../lib/cipherlinks')
const decodeLeaves = require('./decode-leaves')
const encodeLeaves = require('./encode-leaves')
const print = require('./print')

function Key (length) {
  const key = na.sodium_malloc(length || na.crypto_secretbox_KEYBYTES)
  na.randombytes_buf(key)

  return key
}

function GroupId () {
  const key = Key().toString('base64')
  return `%${key}.cloaked`
}

module.exports = {
  Key,
  GroupKey: Key,
  MsgKey: Key,
  GroupId,
  FeedId: () => new FeedId().mock().toTFK(),
  PrevMsgId: () => new MsgId().mock().toTFK(),

  decodeLeaves,
  encodeLeaves,
  print
}
