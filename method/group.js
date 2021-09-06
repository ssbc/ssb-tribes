const { box } = require('envelope-js')
const { keySchemes } = require('private-group-spec')
const { SecretKey } = require('ssb-private-group-keys')
const bfe = require('ssb-bfe')
const Crut = require('ssb-crut')

const { groupId } = require('../lib')
const initSpec = require('../spec/group/init')
const addMemberSpec = require('../spec/group/add-member')
const groupPOBoxSpec = require('../spec/group/po-box')

module.exports = function GroupMethods (ssb, keystore, state, scuttlePOBox) {
  const {
    spec: {
      isUpdate: isAddGroupPOBox
    }
  } = new Crut(ssb, groupPOBoxSpec)

  return {
    init (cb) {
      const groupKey = new SecretKey()
      const content = {
        type: 'group/init',
        tangles: {
          group: { root: null, previous: null }
        }
      }
      if (!initSpec.isValid(content)) return cb(new Error(initSpec.isValid.errorsString))

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
    },

    addMember (groupId, authorIds, opts = {}, cb) {
      const { key, root } = keystore.group.get(groupId)

      const content = {
        type: 'group/add-member',
        version: 'v1',
        groupKey: key.toString('base64'),
        root,
        tangles: {
          members: {
            root: root,
            previous: [root] // TODO calculate previous for members tangle
          },

          group: { root, previous: [root] }
          // NOTE: this is a dummy entry which is over-written in publish hook
        },
        recps: [groupId, ...authorIds]
      }

      if (opts.text) content.text = opts.text

      if (!addMemberSpec.isValid(content)) return cb(new Error(addMemberSpec.isValid.errorsString))

      ssb.publish(content, cb)
    },

    addPOBox (groupId, cb) {
      const info = keystore.group.get(groupId)
      if (!info) return cb(new Error('unknown groupId: ' + groupId))

      scuttlePOBox.create({}, (err, data) => {
        if (err) return cb(err)

        const { poBoxId, poBoxKey } = data
        const { root } = info

        const content = {
          type: 'group/po-box',
          keys: {
            set: {
              poBoxId,
              key: poBoxKey.toString('base64')
            }
          },
          tangles: {
            poBox: { root, previous: [root] },
            // TODO 2021-09-03 (mix)
            // tangles.poBox isn't a real tangle yes
            // teach Crut to be relaxed about the root node being a different type, then use crut.update(groupId, props, cb)
            group: { root, previous: [root] }
            // NOTE: this is a dummy entry which is over-written in publish hook
          },
          recps: [groupId]
        }

        if (!isAddGroupPOBox(content)) return cb(new Error(isAddGroupPOBox.errorsString))

        ssb.publish(content, (err, msg) => {
          if (err) return cb(err)
          cb(null, poBoxId)
        })
      })
    }
  }
}
