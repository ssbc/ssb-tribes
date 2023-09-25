/* eslint-disable camelcase */

const { isFeed, isCloakedMsg: isGroup } = require('ssb-ref')
const { box, unboxKey, unboxBody } = require('envelope-js')
const { SecretKey, poBoxKey, DiffieHellmanKeys, DHKeys } = require('ssb-private-group-keys')
const isPoBox = require('ssb-private-group-keys/lib/is-po-box') // TODO find better home
const bfe = require('ssb-bfe')

const { isValidRecps } = require('./lib')

function isEnvelope (ciphertext) {
  return ciphertext.endsWith('.box2')
  // && base64?
}

module.exports = function Envelope (keystore, state) {
  const easyPoBoxKey = poBoxKey.easy(state.keys)

  function addDMPairSync (myKeys, theirId) {
    const myId = myKeys.id
    const myDhKeys = new DHKeys(myKeys, { fromEd25519: true })
    const theirKeys = { public: bfe.encode(theirId).slice(2) }
    const theirDhKeys = new DHKeys(theirKeys, { fromEd25519: true })
    return keystore.dm.add(myId, theirId, myDhKeys, theirDhKeys, (err) => {
      if (err) console.error(err)
    })
  }

  function getDmKey (theirId) {
    if (!keystore.dm.has(state.keys.id, theirId)) addDMPairSync(state.keys, theirId)
    return keystore.dm.get(state.keys.id, theirId)
  }

  function boxer (content, previousFeedState) {
    const recps = [...content.recps]
    // NOTE avoid mutating the original recps
    if (process.env.NODE_ENV !== 'test') {
      // slip my own_key into a slot if there's space
      // we disable in tests because it makes checking unboxing really hard!
      if (recps.indexOf(state.keys.id) < 0) recps.push(state.keys.id)
    }

    if (!isValidRecps(recps)) throw isValidRecps.error

    const recipentKeys = recps.map(recp => {
      if (isGroup(recp)) {
        const keyInfo = keystore.group.get(recp)
        if (!keyInfo) throw new Error(`unknown groupId ${recp}, cannot encrypt message`)
        return keyInfo.writeKey
      }
      if (isFeed(recp)) {
        if (recp === state.keys.id) return keystore.self.get() // use a special key for your own feedId
        else return getDmKey(recp)
      }
      if (isPoBox(recp)) return easyPoBoxKey(recp)

      // isValidRecps should guard against hitting this
      throw new Error('did now how to map recp > keyInfo')
    })

    const plaintext = Buffer.from(JSON.stringify(content), 'utf8')
    const msgKey = new SecretKey().toBuffer()

    const previousMessageId = bfe.encode(previousFeedState.id)

    const envelope = box(plaintext, state.feedId, previousMessageId, msgKey, recipentKeys)
    return envelope.toString('base64') + '.box2'
  }

  /* unboxer components */
  function key (ciphertext, { author, previous }) {
    if (!isEnvelope(ciphertext)) return null

    const envelope = Buffer.from(ciphertext.replace('.box2', ''), 'base64')
    const feed_id = bfe.encode(author)
    const prev_msg_id = bfe.encode(previous)

    let readKey

    /* check my DM keys (self, other) */
    if (author === state.keys.id) {
      const trial_own_keys = [keystore.self.get()]
      readKey = unboxKey(envelope, feed_id, prev_msg_id, trial_own_keys, { maxAttempts: 16 })
      if (readKey) return readKey
    } else {
      const trial_dm_keys = [getDmKey(author)]

      readKey = unboxKey(envelope, feed_id, prev_msg_id, trial_dm_keys, { maxAttempts: 16 })
      if (readKey) return readKey
    }

    /* check my group keys */
    const trial_group_keys = keystore.group.listSync().map(groupId => keystore.group.get(groupId).readKeys).flat()
    // NOTE we naively try *every* group key. Several optimizations are possible to improve this (if needed)
    // 1. keep "try all" approach, but bubble successful keys to the front (frequently active groups get quicker decrypts)
    // 2. try only groups this message (given author) - cache group membership, and use this to inform keys tried
    readKey = unboxKey(envelope, feed_id, prev_msg_id, trial_group_keys, { maxAttempts: 1 })
    // NOTE the group recp is only allowed in the first slot,
    // so we only test group keys in that slot (maxAttempts: 1)
    if (readKey) return readKey

    /* check my poBox keys */
    // TODO - consider how to reduce redundent computation + memory use here
    const trial_poBox_keys = keystore.poBox.list()
      .map(poBoxId => {
        const data = keystore.poBox.get(poBoxId)

        const poBox_dh_secret = Buffer.concat([
          bfe.toTF('encryption-key', 'box2-pobox-dh'),
          data.key
        ])

        const poBox_id = bfe.encode(poBoxId)
        const poBox_dh_public = Buffer.concat([
          bfe.toTF('encryption-key', 'box2-pobox-dh'),
          poBox_id.slice(2)
        ])

        const author_id = bfe.encode(author)
        const author_dh_public = new DiffieHellmanKeys({ public: author }, { fromEd25519: true })
          .toBFE().public

        return poBoxKey(poBox_dh_secret, poBox_dh_public, poBox_id, author_dh_public, author_id)
      })

    return unboxKey(envelope, feed_id, prev_msg_id, trial_poBox_keys, { maxAttempts: 16 })
  }

  function value (ciphertext, { author, previous }, read_key) {
    if (!isEnvelope(ciphertext)) return null

    // TODO change unboxer signature to allow us to optionally pass variables
    // from key() down here to save computation
    const envelope = Buffer.from(ciphertext.replace('.box2', ''), 'base64')
    const feed_id = bfe.encode(author)
    const prev_msg_id = bfe.encode(previous)

    const plaintext = unboxBody(envelope, feed_id, prev_msg_id, read_key)
    if (!plaintext) return

    return JSON.parse(plaintext.toString('utf8'))
  }

  return {
    boxer,
    unboxer: { key, value }
  }
}
