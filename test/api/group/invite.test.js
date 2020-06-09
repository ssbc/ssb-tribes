const test = require('tape')
const { Server } = require('../../helpers')
const { FeedId } = require('../../../lib/cipherlinks')

test('private2.group.invite', t => {
  const server = Server()

  server.private2.group.create('the pantheon', (err, data) => {
    t.error(err)

    const { groupId, groupKey, groupInitMsg } = data
    const authorIds = [
      new FeedId().mock().toSSB(),
      new FeedId().mock().toSSB()
    ]

    server.private2.group.invite(groupId, authorIds, { text: 'welcome friends' }, (err, invite) => {
      t.error(err)

      server.get({ id: invite.key, private: true }, (_, value) => {
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
          server.close()
        }, 1e3)
      })
    })
  })
})
