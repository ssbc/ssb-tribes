const { box } = require('envelope-js')
const { keySchemes } = require('private-group-spec')
const { SecretKey } = require('ssb-private-group-keys')
const bfe = require('ssb-bfe')
const Crut = require('ssb-crut')
const pull = require('pull-stream')

const { groupId: buildGroupId, poBoxKeys } = require('../lib')
const initSpec = require('../spec/group/init')
const addMemberSpec = require('../spec/group/add-member')
const excludeMemberSpec = require('../spec/group/exclude-member')
const groupPoBoxSpec = require('../spec/group/po-box')

module.exports = function GroupMethods (ssb, keystore, state) {
  const groupPoBoxCrut = new Crut(
    ssb,
    groupPoBoxSpec,
    {
      publish: (...args) => ssb.tribes.publish(...args),
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
      // we have to do it manually this one time, because the auto-boxing checks for a known groupId
      // but the groupId is derived from the messageId of this message (which does not exist yet
      //const plain = Buffer.from(JSON.stringify(content), 'utf8')

      //const msgKey = new SecretKey().toBuffer()
      const recps = [
        { key: groupKey.toBuffer(), scheme: keySchemes.private_group },
        ssb.id // sneak this in so can decrypt it ourselves without rebuild!
      ]

      // TODO
      // consider making sure creator can always open the group (even if lose keystore)
      // would also require adding groupKey to this message

      ssb.db.create({
        content,
        recps,
        encryptionFormat: 'box2',
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

        ssb.tribes.publish(content, cb)
      })
    },
    excludeMembers (groupId, authorIds, cb) {
      const { root } = keystore.group.get(groupId)

      const content = {
        type: 'group/exclude-member',
        excludes: authorIds,
        tangles: {
          members: { root, previous: [root] },
          group: { root, previous: [root] }
          // NOTE: these are dummy entries which are over-written in the publish hook
        },
        recps: [groupId]
      }

      if (!excludeMemberSpec.isValid(content)) return cb(new Error(excludeMemberSpec.isValid.errorsString))

      ssb.tribes.publish(content, cb)
    },
    listAuthors (groupId, cb) {
      const query = [{
        $filter: {
          value: {
            content: {
              type: 'group/add-member'
            }
          }
        }
      }]

      pull(
        ssb.query.read({ query }),
        pull.filter(addMemberSpec.isValid),
        pull.filter(msg =>
          groupId === msg.value.content.recps[0]
        ),
        pull.map(msg => msg.value.content.recps.slice(1)),
        pull.flatten(),
        pull.unique(),
        pull.collect((err, addedMembers) => {
          if (err) return cb(err)

          const excludedQuery = [{
            $filter: {
              value: {
                content: {
                  type: 'group/exclude-member'
                }
              }
            }
          }]

          pull(
            ssb.query.read({ query: excludedQuery }),
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

      keystore.poBox.add(poBoxId, { key: secret }, (err) => {
        if (err) return cb(err)

        const props = {
          keys: {
            poBoxId,
            key: secret.toString('base64')
          }
        }

        console.log('about to update group pobox crut', groupId)
        groupPoBoxCrut.updateGroup(groupId, props, (err) => {
          if (err) return cb(err)
          console.log('updated group pobox crut')

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
