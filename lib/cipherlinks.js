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

class FeedId {
  constructor (feed) {
    if (!isFeed(feed)) throw new Error(`FeedId expected to initialised with a scuttlebutt feedId, received "${feed}"`)

    this.type = Buffer.from([0])
    this.format = Buffer.from([0]) // hardcoded "classic" at the moment
    this.key = Buffer.from(feed.replace('@', '').replace('.ed25519', ''), 'base64')
  }

  toTFK () {
    return Buffer.concat([
      this.type,
      this.format,
      this.key
    ])
  }

  toSSB () {
    return (
      TYPE_PREFIXES[this.type.readInt8()] +
      this.key.toString('base64') +
      FORMAT_SUFFIXES[this.format.readInt8()][this.type.readInt8()]
    )
  }
}

class MsgId {
  constructor (msg) {
    if (!isMsg(msg)) throw new Error(`MsgId expected to initialised with a scuttlebutt msgId, received "${msg}"`)

    this.type = Buffer.from([1])
    this.format = Buffer.from([0]) // hardcoded "classic" at the moment
    this.key = Buffer.from(msg.replace('@', '').replace('.sha256', ''), 'base64')
  }

  toTFK () {
    return Buffer.concat([
      this.type,
      this.format,
      this.key
    ])
  }

  toSSB () {
    return (
      TYPE_PREFIXES[this.type.readInt8()] +
      this.key.toString('base64') +
      FORMAT_SUFFIXES[this.format.readInt8()][this.type.readInt8()]
    )
  }
}
module.exports ={
  FeedId,
  MsgId
}
