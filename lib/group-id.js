const { DeriveSecret, CloakedMsgId } = require('envelope-js')
const LABELS = require('envelope-spec/derive_secret/constants.json')

const { FeedId, MsgId } = require('./cipherlinks')

module.exports = function groupId ({ groupInitMsg, msgKey, readKey }) {
  const msgId = new MsgId(groupInitMsg.key).toTFK()

  if (!readKey) {
    if (msgKey) {
      // This mainly occurs when we're manually boxing and can't be bothered to
      // calculate the read key.
      readKey = deriveReadKey(groupInitMsg, msgKey)
    } else if (unboxKey(groupInitMsg)) {
      // This occurs if the message streams from a view and has been
      // auto-unboxed.
      readKey = Buffer.from(unboxKey(groupInitMsg), 'base64')
    } else {
      throw new Error('Read key must be defined???')
    }
  }

  console.log({ msgId, readKey })
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
