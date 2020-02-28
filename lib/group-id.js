const { DeriveSecret, CloakedMsgId } = require('@envelope/js')
const LABELS = require('@envelope/spec/derive_secret/constants.json')

const { FeedId, MsgId } = require('./cipherlinks')

module.exports = function groupId (groupInitMsg, msgKey) {
  const msgId = new MsgId(groupInitMsg.key).toTFK()
  const readKey = _readKey(groupInitMsg, msgKey)

  const cloakedMsgId = new CloakedMsgId(msgId, readKey)

  return `%${cloakedMsgId}.cloaked`
}

function _readKey (msg, msgKey) {
  const derive = DeriveSecret(
    new FeedId(msg.value.author).toTFK(),
    new MsgId(msg.value.previous).toTFK()
  )

  return derive(msgKey, [LABELS.read_key])
}
