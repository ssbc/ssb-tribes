const { Cipherlink } = require('@envelope/js')
const TYPES = require('@envelope/spec/encoding/tfk.json')
const { isBuffer } = Buffer
const { isFeedId, isMsg } = require('ssb-ref')

class Scuttlelink extends Cipherlink {
  toSSB () {
    const { sigil, suffix } = TYPES[this.type].formats[this.format]

    return sigil + this.key.toString('base64') + suffix
  }
}

/* NOTE this assumes for ssb/classic feed type */
class FeedId extends Scuttlelink {
  constructor (id) {
    var key
    if (isBuffer(id)) key = id
    else if (typeof id === 'string') {
      if (isFeedId(id)) key = Buffer.from(id.replace('@', '').replace('.ed25519', ''), 'base64')
      else throw new Error(`expected ssb/classic feedId, got ${id}`)
    }

    super({ type: 0, format: 0, key })
  }
}

/* NOTE this assumes for ssb/classic message type */
class MsgId extends Scuttlelink {
  constructor (id) {
    var key
    if (isBuffer(id)) key = id
    else if (typeof id === 'string') {
      if (isMsg(id)) key = Buffer.from(id.replace('%', '').replace('.sha256', ''), 'base64')
      else throw new Error(`expected ssb/classic msgId, got ${id}`)
    }
    else if (id === null) {
      key = Buffer.alloc(32)
    }

    super({ type: 1, format: 0, key })
  }
}

module.exports = {
  FeedId,
  MsgId
}
