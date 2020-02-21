const na = require('sodium-native')
const { isFeedId, isMsg } = require('ssb-ref')

const TYPE_PREFIXES = {
  0: '@',
  1: '%'
}

const FORMAT_SUFFIXES = {
  0: {             // format
    0: '.ed25519', // type
    1: '.sha256'
  }
}

class Cipherlink {
  constructor ({ type, format, key } = {}) {
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
    return (
      TYPE_PREFIXES[this.type] +
      this.key.toString('base64') +
      FORMAT_SUFFIXES[this.format][this.type]
    )
  }

  mock () {
    this.key = Buffer.alloc(32)
    na.randombytes_buf(this.key)

    return this
  }
}

class FeedId extends Cipherlink {
  constructor (feed) {
    if (feed && !isFeedId(feed)) throw new Error(`FeedId expected to initialised with a scuttlebutt feedId, received "${feed}"`)

    super({
      type: 0,
      format: 0, // hardcoded "classic" at the moment
      key: feed
        ? Buffer.from(feed.replace('@', '').replace('.ed25519', ''), 'base64')
        : null
    })
  }
}

class MsgId extends Cipherlink {
  constructor (msg) {
    if (msg && !isMsg(msg)) throw new Error(`MsgId expected to initialised with a scuttlebutt msgId, received "${msg}"`)

    super({
      type: 1,
      format: 0, // hardcoded "classic" at the moment
      key: msg
        ? Buffer.from(msg.replace('@', '').replace('.sha256', ''), 'base64')
        : null
    })
  }
}

module.exports ={
  FeedId,
  MsgId
}
