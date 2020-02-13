const test = require('tape')
const Server = require('./server')
const { GroupKey, GroupId } = require('./helpers')

test('publish', t => {
  const server = Server()

  const groupId = GroupId()
  const groupKey = GroupKey()

  server.private2.group.add(groupId, groupKey, (err, success) =>{
    const content = {
      type: 'announce',
      text: 'summer has arrived in wellington!',
      recps: [groupId]
    }

    server.publish(content, (err, msg) => {
      t.true(msg.value.content.endsWith('.box2'), 'publishes box2 cipherstring')

      server.close(() => {
        console.log('closed')
      })
      t.end()
    })
  })
})

// TODO
// - add unboxer which recognises .box2 strings
// - get this test about to pass
// - write spec + tests for external_nonce calcuation
// - ssb-db
//   - add "addBoxer" method


// SSB-specs to write
//
// - how to calculate external_nonce
// - how to derive groupId
// - need a store which tracks:
//   - groupId > groupKey
//   - if a box2 message comes from feedId X, which keys should I try (find which groups a feedId has access to)
