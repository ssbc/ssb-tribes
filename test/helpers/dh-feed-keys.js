const { generate } = require('ssb-keys')

const { FeedId } = require('./cipherlinks')
const { DHKeys, FeedKeys } = require('ssb-private-group-keys')

module.exports = function DHFeedKeys (keys) {
  const ssbKeys = keys || generate()

  const feedKeys = new FeedKeys(ssbKeys).toBuffer()

  return {
    dh: new DHKeys(feedKeys).toTFK(),
    feedId: new FeedId(ssbKeys.id).toTFK(),
    sigilFeedId: ssbKeys.id
  }
}
