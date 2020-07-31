const { isFeed, isCloakedMsg: isGroup } = require('ssb-ref')
const { box, unboxKey, unboxBody } = require('envelope-js')

const SecretKey = require('./lib/secret-key')
const { FeedId, MsgId } = require('./lib/cipherlinks')

function isEnvelope (ciphertext) {
  return ciphertext.endsWith('.box2')
}

module.exports = function Envelope (keystore, state) {
  function boxer (content, previousFeedState) {
    if (content.recps.length > 16) {
      throw new Error(`private-group spec allows maximum 16 slots, but you've tried to use ${content.recps.length}`)
    }
    // groupId can only be in first "slot"
    if (!isGroup(content.recps[0]) && !isFeed(content.recps[0])) return null

    // any subsequent slots are only for feedId
    if (content.recps.length > 1 && !content.recps.slice(1).every(isFeed)) {
      if (content.recps.slice(1).find(isGroup)) {
        throw new Error('private-group spec only allows groupId in the first slot')
      }
      return null
    }

    // the spec currently disallows encrypting to your own feedId
    if (content.recps.find(recp => recp === state.keys.id)) {
      console.warn('private-group spec disallows encrypting to your own feedId. Use a private group only you are in')
      return null // this will allow ssb-private1 to step in
    }

    const recipentKeys = content.recps.map(r => {
      if (isGroup(r)) {
        const keyInfo = keystore.group.get(r)
        if (!keyInfo) throw new Error(`unknown groupId ${r}, cannot encrypt message`)

        return keyInfo
      }

      return keystore.author.sharedDMKey(r)
    })
    const plaintext = Buffer.from(JSON.stringify(content), 'utf8')
    const msgKey = new SecretKey().toBuffer()

    const previousMessageId = new MsgId(previousFeedState.id).toTFK()

    const envelope = box(plaintext, state.feedId, previousMessageId, msgKey, recipentKeys)
    return envelope.toString('base64') + '.box2'
  }

  /* unboxer components */
  function key (ciphertext, { author, previous }) {
    if (!isEnvelope(ciphertext)) return null

    const envelope = Buffer.from(ciphertext.replace('.box2', ''), 'base64')
    const feed_id = new FeedId(author).toTFK()
    const prev_msg_id = new MsgId(previous).toTFK()

    const trial_group_keys = keystore.author.groupKeys(author)
    const read_key = unboxKey(envelope, feed_id, prev_msg_id, trial_group_keys, { maxAttempts: 1 })
    // NOTE the group recp is only allowed in the first slot,
    // so we only test group keys in that slot (maxAttempts: 1)
    if (read_key) return read_key

    const trial_dm_key = keystore.author.sharedDMKey(author)
    return unboxKey(envelope, feed_id, prev_msg_id, [trial_dm_key], { maxAttempts: 16 })
    // we then test all dm keys in up to 16 slots (maxAttempts: 16)
  }

  function value (ciphertext, { author, previous }, read_key) {
    if (!isEnvelope(ciphertext)) return null

    // TODO change unboxer signature to allow us to optionally pass variables
    // from key() down here to save computation
    const envelope = Buffer.from(ciphertext.replace('.box2', ''), 'base64')
    const feed_id = new FeedId(author).toTFK()
    const prev_msg_id = new MsgId(previous).toTFK()

    const plaintext = unboxBody(envelope, feed_id, prev_msg_id, read_key)
    if (!plaintext) return

    return JSON.parse(plaintext.toString('utf8'))
  }

  return {
    boxer,
    unboxer: { key, value }
  }
}
