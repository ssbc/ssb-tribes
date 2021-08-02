const { box } = require('envelope-js')
const { keySchemes } = require('private-group-spec')

const { SecretKey } = require('ssb-private-group-keys')
const groupId = require('../../lib/group-id')
const { isValid } = require('../../spec/group/init')
const bfe = require('ssb-bfe')

module.exports = function GroupCreate (ssb, keystore, state) {
  return function groupCreate (cb) {
    const groupKey = new SecretKey()
    const content = {
      type: 'group/init',
      tangles: {
        group: { root: null, previous: null }
      }
    }
    if (!isValid(content)) return cb(new Error(isValid.errorsString))

    /* enveloping */
    // we have to do it manually this one time, because the auto-boxing checks for a known groupId
    // but the groupId is derived from the messageId of this message (which does not exist yet
    const plain = Buffer.from(JSON.stringify(content), 'utf8')

    const msgKey = new SecretKey().toBuffer()
    const recipientKeys = [
      { key: groupKey.toBuffer(), scheme: keySchemes.private_group }
    ]
    // TODO
    // consider making sure creator can always open the group (even if lose keystore)
    // would require adding them as a recipeint
    //   - need to check if it's safe to make a sharedDM with oneself
    // would also require adding groupKey to this message

    ssb.getFeedState(ssb.id, (err, previousFeedState) => {
      if (err) return cb(err)

      const previousMessageId = bfe.encode(previousFeedState.id)

      const envelope = box(plain, state.feedId, previousMessageId, msgKey, recipientKeys)
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
    })
  }
}
