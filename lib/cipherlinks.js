const na = require('sodium-native')
const { isFeedId, isMsg } = require('ssb-ref')
const { isBuffer } = Buffer
const hkdf = require('futoin-hkdf')

const encode = require('@envelope/core/util/slp-encode')
const TYPES = require('@envelope/spec/encoding/tfk.json')
const isCloakedId = require('./is-cloaked-msg-id')

class Cipherlink {
  constructor ({ type, format, key } = {}) {
    if (key && key.length !== 32) throw new Error(`Cypherlinks expected to have key of length 32 bytes, got ${key.length}`)

    this.type = type
    this.format = format
    this.key = key
  }

  toTFK () {
    return Buffer.concat([
      Buffer.from([this.type]),
      Buffer.from([this.format]),
      this.key
    ])
  }

  toSSB () {
    const { sigil, suffix } = TYPES[this.type].formats[this.format]

    return sigil + this.key.toString('base64') + suffix
  }

  mock () {
    this.key = Buffer.alloc(32)
    na.randombytes_buf(this.key)

    return this
  }
}

class FeedId extends Cipherlink {
  constructor (id) {
    var key
    if (isBuffer(id)) key = id
    else if (typeof id === 'string') {
      if (isFeedId(id)) key = Buffer.from(id.replace('@', '').replace('.ed25519', ''), 'base64')
      else throw new Error(`expected feedId, got ${id}`)
    }

    super({ type: 0, format: 0, key })
  }
}

class MsgId extends Cipherlink {
  constructor (id) {
    var key
    if (isBuffer(id)) key = id
    else if (typeof id === 'string') {
      if (isMsg(id)) key = Buffer.from(id.replace('%', '').replace('.sha256', ''), 'base64')
      else throw new Error(`expected msgId, got ${id}`)
    }
    else if (id === null) {
      key = Buffer.alloc(32)
    }

    super({ type: 1, format: 0, key })
  }
}

class CloakedMsgId extends Cipherlink {
  constructor (id) {
    var key
    if (isBuffer(id)) key = id
    else if (typeof id === 'string') {
      if (isCloakedId(id)) key = Buffer.from(id.replace('%', '').replace('.cloaked', ''), 'base64')
      else throw new Error(`expected cloakedId, got ${id}`)
    }

    super({ type: 1, format: 2, key })
  }
}

const hash = 'sha256'
const hash_len = hkdf.hash_length(hash)
const length = 32

class GroupId extends CloakedMsgId {
  constructor (init_msg_id, group_key) {
    if (!isBuffer(init_msg_id)) throw new Error ('GroupId expects init_msg_id to be a Buffer')
    if (!isBuffer(group_key)) throw new Error ('GroupId expects group_key to be a Buffer')

    var info = [
      Buffer.from('ssb-derive-cloaked-msg-id', 'utf-8'),
      init_msg_id
    ]

    var key = hkdf.expand(hash, hash_len, group_key, length, encode(info))
    super(key)
  }
}

module.exports = {
  FeedId,
  MsgId,
  CloakedMsgId,
  GroupId
}
