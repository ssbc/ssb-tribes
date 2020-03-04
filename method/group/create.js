const { box } = require('@envelope/js')
const SCHEMES = require('private-group-spec/key-schemes.json').scheme

const Secret = require('../../lib/secret-key')
const groupId = require('../../lib/group-id')

module.exports = function GroupCreate (ssb) {
  return function groupCreate (state, name = '', cb) {
    const groupKey = new Secret()
    const content = {
      type: 'group/init',
      name: { set: name },
      tangles: {
        group: { root: null, previous: null }
      }
    }

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
        groupId: groupId(groupInitMsg, msgKey),
        groupKey: groupKey.toBuffer(),
        groupInitMsg
      }
      cb(null, data)
    })
  }
}
