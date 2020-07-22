const test = require('tape')
const { Server } = require('../../helpers')
const { isCloakedMsg: isGroup } = require('ssb-ref')
const { FeedId } = require('../../../lib/cipherlinks')

test('tribes.application.create', t => {
  const server = Server({ name: 'createApplication' })
  const authorIds = [new FeedId().mock().toSSB(), new FeedId().mock().toSSB()]
  // this is more of an integration test over the api
  console.log('FEED', authorIds)
  server.tribes.create('the pantheon', (err, data) => {
    t.error(err)
    console.log(data.groupId)
    server.tribes.application.create(
      data.groupId,
      authorIds,
      'Hello!',
      (err, data) => {
        console.log('GOTTTT', err, data)
        if (err) throw err
        const expected = {
          type: 'group/application',
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

        server.close()
        t.end()
      }
    )
  })
})
