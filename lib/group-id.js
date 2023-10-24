/* eslint-disable camelcase */

const { unboxKey, DeriveSecret, CloakedMsgId } = require('envelope-js')
const LABELS = require('envelope-spec/derive_secret/constants.json')
const { keySchemes } = require('private-group-spec')

const bfe = require('ssb-bfe')

module.exports = function groupId ({ groupInitMsg, readKey, msgKey, groupKey }) {
  const msgId = bfe.encode(groupInitMsg.key)

  if (!readKey) {
    if (groupInitMsg.value.meta && groupInitMsg.value.meta.unbox) {
      // when coming from a view which has auto-unboxed.
      readKey = toBuffer(groupInitMsg.value.meta.unbox)
    } else if (msgKey) {
      // in method/group/init, we already have msgKey, and this help us out
      readKey = fromMsgKey(groupInitMsg, msgKey)
    } else if (groupKey) {
      // when we've just heard a group/add-member message, we need to calculate
      // groupId and only have these two things
      readKey = fromGroupKey(groupInitMsg, groupKey)
    } else {
      throw new Error('Read key must be defined???')
    }
  }

  const cloakedMsgId = new CloakedMsgId(msgId, readKey).toString()

  return `%${cloakedMsgId}.cloaked`
}

function fromMsgKey (msg, msgKey) {
  if (!msgKey) throw new Error('groupId: expected either msgKey OR readKey')

  const derive = DeriveSecret(
    bfe.encode(msg.value.author),
    bfe.encode(msg.value.previous)
  )

  return derive(msgKey, [LABELS.read_key])
}

function fromGroupKey (msg, groupKey) {
  const { author, previous } = msg.value
  const content = (msg.meta && msg.meta.originalContent) || msg.value.content

  const envelope = Buffer.from(content.replace('.box2', ''), 'base64')
  const feed_id = bfe.encode(author)
  const prev_msg_id = bfe.encode(previous)

  const group_key = { key: toBuffer(groupKey), scheme: keySchemes.private_group }
  return unboxKey(envelope, feed_id, prev_msg_id, [group_key], { maxAttempts: 1 })
}

function toBuffer (str) {
  if (Buffer.isBuffer(str)) return str

  return Buffer.from(str, 'base64')
}
