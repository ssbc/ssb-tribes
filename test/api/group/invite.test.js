const test = require('tape')
const { Server } = require('../../helpers')
const { FeedId } = require('../../../lib/cipherlinks')

test('tribes.invite', t => {
  const kaitiaki = Server()

  kaitiaki.tribes.create('the pantheon', (err, data) => {
    t.error(err, 'creates group')

    const { groupId, groupKey, groupInitMsg } = data
    const authorIds = [
      new FeedId().mock().toSSB(),
      new FeedId().mock().toSSB()
    ]

    kaitiaki.tribes.invite(groupId, authorIds, { text: 'welcome friends' }, (err, invite) => {
      t.error(err, 'sends invite')

      console.log(invite)

      kaitiaki.get({ id: invite.key, private: true }, (_, value) => {
        const expected = {
          type: 'group/add-member',
          version: 'v1',
          groupKey: groupKey.toString('base64'),
          root: groupInitMsg.key,

          text: 'welcome friends',
          recps: [groupId, ...authorIds],

          tangles: {
            group: { root: groupInitMsg.key, previous: [groupInitMsg.key] },
            members: { root: groupInitMsg.key, previous: [groupInitMsg.key] }
          }
        }

        t.deepEqual(value.content, expected, 'publishes an invite!')

        setTimeout(() => {
          t.end()
          kaitiaki.close()
        }, 1e3)
      })
    })
  })
})
