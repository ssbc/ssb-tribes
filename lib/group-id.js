const { DeriveSecret, CloakedMsgId } = require('@envelope/js')
const LABELS = require('@envelope/spec/derive_secret/constants.json')

const { FeedId, MsgId } = require('./cipherlinks')

module.exports = function groupId (groupInitMsg, msgKey, readKey) {
  const msgId = new MsgId(groupInitMsg.key).toTFK()
  readKey = readKey || _readKey(groupInitMsg, msgKey)

  const cloakedMsgId = new CloakedMsgId(msgId, readKey).toString()

  return `%${cloakedMsgId}.cloaked`
}

function _readKey (msg, msgKey) {
  const derive = DeriveSecret(
    new FeedId(msg.value.author).toTFK(),
    new MsgId(msg.value.previous).toTFK()
  )

  return derive(msgKey, [LABELS.read_key])
}
