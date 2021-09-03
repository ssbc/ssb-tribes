const bfe = require('ssb-bfe')
const na = require('sodium-native')
const { Cipherlink } = require('envelope-js')
const { isFeedId, isMsg } = require('ssb-ref')
const { SecretKey } = require('ssb-private-group-keys')
const keys = require('ssb-keys')

const { isBuffer } = Buffer

const zeros = Buffer.alloc(32)

// TODO 2021-09-02 replace all this with ssb-bfe methods

class Scuttlelink extends Cipherlink {
  // inherited methods
  // - toBuffer()
  // - toTFK() // TODO go upstream and change this
  // - mock()

  toBFE () {
    return this.toTFK()
  }

  toSSB () {
    if (zeros.compare(this.key) === 0) return null
    // NOTE This is a funny edge case for representing "previous: null"
    // perhaps this should not be here

    const buf = Buffer.concat([
      Buffer.from([this.type, this.format]),
      this.key
    ])
    return bfe.decode(buf)
  }
}

/* NOTE this assumes for ssb/classic feed type */
class FeedId extends Scuttlelink {
  constructor (id) {
    let key
    if (isBuffer(id)) key = id
    else if (typeof id === 'string') {
      if (isFeedId(id)) key = Buffer.from(id.replace('@', '').replace('.ed25519', ''), 'base64')
      else throw new Error(`expected ssb/classic feedId, got ${id}`)
    }

    super({ type: 0, format: 0, key })
  }

  mock () {
    this.key = Buffer.from(keys.generate().public, 'base64')
    return this
  }
}

/* NOTE this assumes for ssb/classic message type */
class MsgId extends Scuttlelink {
  constructor (id) {
    let key
    if (isBuffer(id)) key = id
    else if (typeof id === 'string') {
      if (isMsg(id)) key = Buffer.from(id.replace('%', '').replace('.sha256', ''), 'base64')
      else throw new Error(`expected ssb/classic msgId, got ${id}`)
    } else if (id === null) {
      key = Buffer.alloc(32)
    }

    super({ type: 1, format: 0, key })
  }
}

class POBoxId extends Scuttlelink {
  constructor (id) {
    let key
    if (isBuffer(id)) key = id
    else if (typeof id === 'string') key = bfe.encode(id).slice(2) // just the data part

    super({ type: 7, format: 0, key })
  }

  mock () {
    this.key = new SecretKey(na.crypto_scalarmult_BYTES).toBuffer()
    return this
  }
}

module.exports = {
  FeedId,
  POBoxId,
  MsgId
}
