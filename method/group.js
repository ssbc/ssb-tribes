const { box } = require('envelope-js')
const { keySchemes } = require('private-group-spec')
const { SecretKey } = require('ssb-private-group-keys')
const bfe = require('ssb-bfe')
const Crut = require('ssb-crut')

const { groupId: buildGroupId, poBoxKeys } = require('../lib')
const initSpec = require('../spec/group/init')
const addMemberSpec = require('../spec/group/add-member')
const excludeMemberSpec = require('../spec/group/exclude-member')
const groupPoBoxSpec = require('../spec/group/po-box')

module.exports = function GroupMethods (ssb, keystore, state) {
  const groupPoBoxCrut = new Crut(ssb, groupPoBoxSpec)

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
        { key: groupKey.toBuffer(), scheme: keySchemes.private_group },
        keystore.ownKeys()[0] // sneak this in so can decrypt it ourselves without rebuild!
      ]

      // TODO
      // consider making sure creator can always open the group (even if lose keystore)
      // would also require adding groupKey to this message

      ssb.getFeedState(ssb.id, (err, previousFeedState) => {
        if (err) return cb(err)

        const previousMessageId = bfe.encode(previousFeedState.id)

        const envelope = box(plain, state.feedId, previousMessageId, msgKey, recipientKeys)
        const ciphertext = envelope.toString('base64') + '.box2'

        ssb.publish(ciphertext, (err, groupInitMsg) => {
          if (err) return cb(err)

          const data = {
            groupId: buildGroupId({ groupInitMsg, msgKey }),
            groupKey: groupKey.toBuffer(),
            root: groupInitMsg.key,
            groupInitMsg
          }

          keystore.group.register(data.groupId, { key: data.groupKey, root: data.root }, (err) => {
            if (err) return cb(err)
            keystore.group.registerAuthors(data.groupId, [ssb.id], (err) => {
              if (err) return cb(err)
              cb(null, data)
            })
          })
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
            root,
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
    excludeMembers (groupId, authorIds, cb) {
      const { root } = keystore.group.get(groupId)

      const content = {
        type: 'group/exclude-member',
        excludes: authorIds,
        tangles: {
          members: {
            root,
            previous: [root] // TODO calculate previous for members tangle
          },

          group: { root, previous: [root] }
          // NOTE: this is a dummy entry which is over-written in publish hook
        },
        recps: [groupId]
      }

      if (!excludeMemberSpec.isValid(content)) return cb(new Error(excludeMemberSpec.isValid.errorsString))

      ssb.publish(content, (err, msg)=> {
        if (err) return cb(err)

        // TODO: remove the excluded members from the keystore. the reverse of the 
        //keystore.group.registerAuthors(groupId, authorIds, (err) => {
        // that invite() does
        
        return cb(null, msg)
      })
    },
    addPOBox (groupId, cb) {
      const info = keystore.group.get(groupId)
      if (!info) return cb(new Error('unknown groupId: ' + groupId))

      const { id: poBoxId, secret } = poBoxKeys.generate()

      keystore.poBox.register(poBoxId, { key: secret }, (err) => {
        if (err) return cb(err)

        const props = {
          keys: {
            poBoxId,
            key: secret.toString('base64')
          }
        }

        groupPoBoxCrut.updateGroup(groupId, props, (err) => {
          if (err) return cb(err)

          cb(null, poBoxId)
        })
      })
    },
    getPOBox (groupId, cb) {
      groupPoBoxCrut.readGroup(groupId, (err, data) => {
        if (err) return cb(err)

        const keys = data.states[0].keys
        if (keys) cb(null, keys)
        else cb(new Error('no poBox found for this group'))
      })
    }
  }
}
