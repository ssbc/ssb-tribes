const test = require('tape')
const { Server } = require('../../helpers')
const Method = require('../../../method')
const { FeedId, MsgId } = require('../../../lib/cipherlinks')

test('method.group.invite', t => {
  const server = Server()
  const keystore = {
  }

  const state = {
    feedId: new FeedId(server.id).toTFK(),
    previous: new MsgId(null).toTFK()
  }
  server.post(m => {
    console.log('HERE', m.value.previous)
    state.previous = new MsgId(m.value.previous).toTFK()
  })

  // some mock, or a keystore spun up on tmp...

  const method = Method(server, keystore, state)

  method.group.create('the pantheon', (err, data) => {
    t.error(err)

    const { groupId, groupKey, groupInitMsg } = data
    const authorIds = [1, 2].map(i => new FeedId().mock().toSSB())

    method.group.invite(groupId, authorIds, { text: 'welcome friends' }, (err, invite) => {
      t.error(err)

      server.get({ id: invite.key, private: true }, (_, value) => {
        const expected = {
          type: 'group/add-member',
          version: 'v1',
          groupKey: groupKey.toString('base64'),
          initialMsg: groupInitMsg,

          text: 'welcome friends',
          recps: [groupId, ...authorIds],

          tangles: {
            group: { root: groupInitMsg.key, previous: [groupInitMsg.key] },
            members: { root: null, previous: null }
          }
        }

        t.deepEqual(value.content, expected, 'publishes an invite!')

        t.end()
        server.close()
      })
    })
  })
})
