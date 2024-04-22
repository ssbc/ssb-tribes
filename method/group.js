const { keySchemes } = require('private-group-spec')
const { SecretKey } = require('ssb-private-group-keys')
const Crut = require('ssb-crut')
const pull = require('pull-stream')
const { where, type: dbType, toPullStream } = require('ssb-db2/operators')

const { groupId: buildGroupId, poBoxKeys } = require('../lib')
const initSpec = require('../spec/group/init')
const addMemberSpec = require('../spec/group/add-member')
const excludeMemberSpec = require('../spec/group/exclude-member')
const groupPoBoxSpec = require('../spec/group/po-box')

module.exports = function GroupMethods (ssb) {
  const groupPoBoxCrut = new Crut(
    ssb,
    groupPoBoxSpec,
    {
      create: ({ content }, cb) => ssb.tribes.publish(content, cb),
      feedId: ssb.id
    }
  )

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
      // we have to do it differently this one time, because the auto-boxing checks for a known groupId
      // but the groupId is derived from the messageId of this message (which does not exist yet

      const recps = [
        { key: groupKey.toBuffer(), scheme: keySchemes.private_group },
        ssb.id // sneak this in so can decrypt it ourselves without rebuild!
      ]

      // TODO
      // consider making sure creator can always open the group (even if lose keyring)
      // would also require adding groupKey to this message

      ssb.db.create({
        content,
        recps,
        encryptionFormat: 'box2'
      }, (err, initMsg) => {
        if (err) return cb(err)

        ssb.get({ id: initMsg.key, meta: true }, (err, groupInitMsg) => {
          if (err) return cb(err)

          const data = {
            groupId: buildGroupId({
              groupInitMsg,
              groupKey: groupKey.toBuffer()
            }),
            groupKey: groupKey.toBuffer(),
            root: groupInitMsg.key,
            groupInitMsg
          }

          ssb.box2.addGroupInfo(data.groupId, { key: data.groupKey, root: data.root }, (err) => {
            if (err) return cb(err)
            cb(null, data)
          })
        })
      })
    },

    addMember (groupId, authorIds, opts = {}, cb) {
      ssb.box2.getGroupInfo(groupId, (err, groupInfo) => {
        if (err) return cb(err)

        const { writeKey, root } = groupInfo

        const content = {
          type: 'group/add-member',
          version: 'v1',
          groupKey: writeKey.key.toString('base64'),
          root,
          tangles: {
            group: { root, previous: [root] },
            members: { root, previous: [root] }
            // NOTE: these are dummy entries which are over-written in the publish function
          },
          recps: [groupId, ...authorIds]
        }

        if (opts.text) content.text = opts.text

        if (!addMemberSpec.isValid(content)) return cb(new Error(addMemberSpec.isValid.errorsString))

        ssb.tribes.publish(content, cb)
      })
    },
    excludeMembers (groupId, authorIds, cb) {
      ssb.box2.getGroupInfo(groupId, (err, groupInfo) => {
        if (err) return cb(Error("Couldn't get group info when excluding", { cause: err }))

        const { root } = groupInfo

        const content = {
          type: 'group/exclude-member',
          excludes: authorIds,
          tangles: {
            group: { root, previous: [root] },
            members: { root, previous: [root] }
            // NOTE: these are dummy entries which are over-written in the publish function
          },
          recps: [groupId]
        }

        if (!excludeMemberSpec.isValid(content)) return cb(new Error(excludeMemberSpec.isValid.errorsString))

        ssb.tribes.publish(content, cb)
      })
    },
    listAuthors (groupId, cb) {
      pull(
        ssb.db.query(
          where(dbType('group/add-member')),
          toPullStream()
        ),
        pull.filter(addMemberSpec.isValid),
        pull.filter(msg =>
          groupId === msg.value.content.recps[0]
        ),
        pull.map(msg => msg.value.content.recps.slice(1)),
        pull.flatten(),
        pull.unique(),
        pull.collect((err, addedMembers) => {
          if (err) return cb(err)

          pull(
            ssb.db.query(
              where(dbType('group/exclude-member')),
              toPullStream()
            ),
            pull.filter(excludeMemberSpec.isValid),
            pull.filter(msg =>
              groupId === msg.value.content.recps[0]
            ),
            pull.map(msg => msg.value.content.excludes),
            pull.flatten(),
            pull.unique(),
            pull.collect((err, excludedMembers) => {
              if (err) return cb(err)

              // NOTE: this currently prevents people who've been removed from being re-added
              // https://github.com/ssbc/ssb-tribes/issues/79
              const members = addedMembers.filter(addedMember => !excludedMembers.includes(addedMember))

              return cb(null, members)
            })
          )
        })
      )
    },
    addPOBox (groupId, cb) {
      const info = ssb.box2.getGroupInfo(groupId)
      if (!info) return cb(new Error('unknown groupId: ' + groupId))

      const { id: poBoxId, secret } = poBoxKeys.generate()

      ssb.box2.addPoBox(poBoxId, { key: secret }, (err) => {
        if (err) return cb(Error("Couldn't add pbox to box2 when adding pobox", { cause: err }))

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

        if (data.keys) cb(null, data.keys)
        else cb(new Error('no poBox found for this group'))
      })
    }
  }
}
