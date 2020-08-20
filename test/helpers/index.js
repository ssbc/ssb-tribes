const Secret = require('../../lib/secret-key')
const { FeedId, MsgId } = require('../../lib/cipherlinks')

const decodeLeaves = require('./decode-leaves')
const encodeLeaves = require('./encode-leaves')
const DHFeedKeys = require('./dh-feed-keys')
const print = require('./print')
const replicate = require('./replicate')
const Server = require('./test-bot')

module.exports = {
  GroupId: () => `%${new Secret().toString()}.cloaked`,
  GroupKey: () => new Secret().toBuffer(),
  FeedId: () => new FeedId().mock().toTFK(),
  PrevMsgId: () => new MsgId().mock().toTFK(),
  DHFeedKeys,

  decodeLeaves,
  encodeLeaves,
  print,
  replicate,
  Server
}
