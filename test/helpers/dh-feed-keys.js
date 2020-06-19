const { generate } = require('ssb-keys')

const { FeedId } = require('../../lib/cipherlinks')
const DHKeys = require('../../lib/dh-keys')
const FeedKeys = require('../../lib/feed-keys')

module.exports = function DHFeedKeys (keys) {
  const ssbKeys = keys || generate()

  const feedKeys = new FeedKeys(ssbKeys).toBuffer()

  return {
    dh: new DHKeys(feedKeys).toTFK(),
    feedId: new FeedId(ssbKeys.id).toTFK(),
    sigilFeedId: ssbKeys.id
  }
}
