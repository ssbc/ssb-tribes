const { DeriveSecret, CloakedMsgId } = require('envelope-js')
const LABELS = require('envelope-spec/derive_secret/constants.json')

const { FeedId, MsgId } = require('./cipherlinks')

module.exports = function groupId ({ groupInitMsg, msgKey, readKey }) {
  const msgId = new MsgId(groupInitMsg.key).toTFK()

  if (!readKey) {
    if (msgKey) {
      readKey = deriveReadKey(groupInitMsg, msgKey)
    }
    else if (unboxKey(groupInitMsg)) {
      readKey = Buffer.from(unboxKey(groupInitMsg), 'base64')
    }
  }

  const cloakedMsgId = new CloakedMsgId(msgId, readKey).toString()

  return `%${cloakedMsgId}.cloaked`
}

function unboxKey (msg) {
  // present if msg has been auto-unboxed
  return msg.value.meta && msg.value.meta.unbox
}

function deriveReadKey (msg, msgKey) {
  if (!msgKey) throw new Error('groupId: expected either msgKey OR readKey')

  const derive = DeriveSecret(
    new FeedId(msg.value.author).toTFK(),
    new MsgId(msg.value.previous).toTFK()
  )

  return derive(msgKey, [LABELS.read_key])
}
