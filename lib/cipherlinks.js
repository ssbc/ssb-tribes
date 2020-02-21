const na = require('sodium-native')
const { isFeed, isMsg } = require('ssb-ref')

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
}

class FeedId extends Cipherlink {
  constructor (feed) {
    if (!isFeed(feed)) throw new Error(`FeedId expected to initialised with a scuttlebutt feedId, received "${feed}"`)

    super({
      type: 0,
      format: 0, // hardcoded "classic" at the moment
      key: Buffer.from(feed.replace('@', '').replace('.ed25519', ''), 'base64')
    })
  }
}

class MsgId extends Cipherlink {
  constructor (msg) {
    if (!isMsg(msg)) throw new Error(`MsgId expected to initialised with a scuttlebutt msgId, received "${msg}"`)

    super({
      type: 1,
      format: 0, // hardcoded "classic" at the moment
      key: Buffer.from(msg.replace('@', '').replace('.sha256', ''), 'base64')
    })
  }
}

module.exports ={
  FeedId,
  MsgId
}
