/* eslint-disable camelcase */

const { isFeed, isCloakedMsg: isGroup } = require('ssb-ref')
const { box, unboxKey, unboxBody } = require('envelope-js')
const { SecretKey, poBoxKey } = require('ssb-private-group-keys')
const isPoBox = require('ssb-private-group-keys/lib/is-po-box') // TODO find better home
const bfe = require('ssb-bfe')

const { isValidRecps } = require('./lib')

function isEnvelope (ciphertext) {
  return ciphertext.endsWith('.box2')
  // && base64?
}

module.exports = function Envelope (keystore, state) {
  const easyPoBoxKey = poBoxKey.easy(state.keys)

  function boxer (content, previousFeedState) {
    const recps = content.recps
    if (process.env.NODE_ENV !== 'test') {
      if (recps.length < 16) recps.push(state.keys.id)
      // slip my own_key into a slot if there's space
      // we disable in tests because it makes checking unboxing really hard!

      // TODO check if I'm already in recps
    }

    if (!isValidRecps(recps)) throw isValidRecps.error

    const recipentKeys = recps.map(recp => {
      if (isGroup(recp)) {
        const keyInfo = keystore.group.get(recp)
        if (!keyInfo) throw new Error(`unknown groupId ${recp}, cannot encrypt message`)
        return keyInfo
      }
      if (isFeed(recp)) {
        if (recp === state.keys.id) return keystore.ownKeys(recp)[0] // use a special key for your own feedId
        else return keystore.author.sharedDMKey(recp)
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

    // TODO change this to new algorithm
    // - check ownKeys
    // - check groups
    // - check DMs / poBox

    const trial_group_keys = keystore.author.groupKeys(author)
    const readKeyFromGroup = unboxKey(envelope, feed_id, prev_msg_id, trial_group_keys, { maxAttempts: 1 })
    // NOTE the group recp is only allowed in the first slot,
    // so we only test group keys in that slot (maxAttempts: 1)
    if (readKeyFromGroup) return readKeyFromGroup

    const trial_misc_keys = [
      ...(
        author === state.keys.id
          ? keystore.ownKeys()
          : [keystore.author.sharedDMKey(author)]
      ),
      ...keystore.poBox.list()
        .map(poBoxId => {
          const data = keystore.poBox.get(poBoxId)
          WIP >>
            Either A) write keystore.author.sharedPOBoxKeys(author) ??
            OR B)  store data: { scheme, id, secret, public } so it's easier to calculate keys
          
          uses poBoxKey(x_dh_secret, x_dh_public, x_id, y_dh_public, y_id)
          // x = poBox
          // y = author
        })
        })
    ]

    console.log('poBoxKeys', keystore.poBox.list().map(keystore.poBox.get))

    return unboxKey(envelope, feed_id, prev_msg_id, trial_misc_keys, { maxAttempts: 16 })
    // we then test all dm keys in up to 16 slots (maxAttempts: 16)
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
