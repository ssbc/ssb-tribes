const na = require('sodium-native')
const hkdf = require('futoin-hkdf')
const { slp } = require('envelope-js')
const crypto = require('crypto')
const constants = require('private-group-spec/direct-messages/constants.json')

const FeedKeys = require('./feed-keys')
const DHKeys = require('./dh-keys')
const { FeedId } = require('./cipherlinks')

const hash = 'SHA256'
const length = 32
const salt = SHA256(constants.SALT)

function directMessageKey (my_dh_secret, my_dh_public, my_feed_tfk, your_dh_public, your_feed_tfk) {
  var input_keying_material = Buffer.alloc(na.crypto_scalarmult_BYTES)
  na.crypto_scalarmult(input_keying_material, my_dh_secret, your_dh_public)

  var info_context = Buffer.from(constants.INFO_CONTEXT, 'utf8')
  var info_keys = [
    Buffer.concat([my_dh_public, my_feed_tfk]),
    Buffer.concat([your_dh_public, your_feed_tfk])
  ].sort()
  var info = slp.encode([info_context, ...info_keys])

  return hkdf(input_keying_material, length, { salt, info, hash })
}

function SHA256 (input) {
  const hash = crypto.createHash('sha256')

  hash.update(input)
  return hash.digest()
}

directMessageKey.easy = EasyDirectMessageKey

function EasyDirectMessageKey (ssbKeys) {
  const my = {
    dh: new DHKeys(new FeedKeys(ssbKeys).toBuffer()).toBuffer(),
    feed: {
      tfk: new FeedId(ssbKeys.id).toTFK()
    }
  }

  return function EasyDirectMessageKey (feedId) {
    const your = {
      dh: new DHKeys(new FeedKeys({ public: feedId.replace('@', '') }).toBuffer()).toBuffer(),
      feed: {
        tfk: new FeedId(feedId).toTFK()
      }
    }

    return directMessageKey(
      my.dh.secret, my.dh.public, my.feed.tfk,
      your.dh.public, your.feed.tfk
    )
  }
}

module.exports = directMessageKey

