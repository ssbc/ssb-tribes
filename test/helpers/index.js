const { replicate } = require('scuttle-testbot')

const { SecretKey } = require('ssb-box2')
const { FeedId, MsgId } = require('./cipherlinks')

const decodeLeaves = require('./decode-leaves')
const encodeLeaves = require('./encode-leaves')
const DHFeedKeys = require('./dh-feed-keys')
const print = require('./print')
const Server = require('./test-bot')

module.exports = {
  GroupId: () => `%${new SecretKey().toString()}.cloaked`,
  GroupKey: () => new SecretKey().toBuffer(),
  FeedId: () => new FeedId().mock().toSSB(),
  MsgId: () => new MsgId().mock().toSSB(),
  DHFeedKeys,

  decodeLeaves,
  encodeLeaves,
  print,
  replicate,
  Server
}
