const Secret = require('../../lib/secret-key')
const { FeedId, MsgId } = require('../../lib/cipherlinks')

const decodeLeaves = require('./decode-leaves')
const encodeLeaves = require('./encode-leaves')
const print = require('./print')


module.exports = {
  GroupId: () => `%${new Secret().toString()}.cloaked`,
  FeedId: () => new FeedId().mock().toTFK(),
  PrevMsgId: () => new MsgId().mock().toTFK(),

  decodeLeaves,
  encodeLeaves,
  print
}
