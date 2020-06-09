const { box } = require('envelope-js')
const SCHEMES = require('private-group-spec/key-schemes.json').scheme

const Secret = require('../../lib/secret-key')
const groupId = require('../../lib/group-id')
const isValid = require('../../lib/is-group-init')

module.exports = function GroupCreate (ssb, _, state) {
  return function groupCreate (cb) {
    const groupKey = new Secret()
    const content = {
      type: 'group/init',
      tangles: {
        group: { root: null, previous: null }
      }
    }
    if (!isValid(content)) return cb(new Error(isValid.errorsString))

    /* enveloping manually - required for just this group initialisation */
    const plain = Buffer.from(JSON.stringify(content), 'utf8')

    const msgKey = new Secret().toBuffer()
    const recipientKeys = [{
      key: groupKey.toBuffer(),
      scheme: SCHEMES.private_group
    }]

    const envelope = box(plain, state.feedId, state.previous, msgKey, recipientKeys)
    const ciphertext = envelope.toString('base64') + '.box2'

    ssb.publish(ciphertext, (err, groupInitMsg) => {
      if (err) return cb(err)

      const data = {
        groupId: groupId({ groupInitMsg, msgKey }),
        groupKey: groupKey.toBuffer(),
        groupInitMsg
      }
      cb(null, data)
    })
  }
}
