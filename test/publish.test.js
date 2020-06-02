const test = require('tape')
const { Server } = require('./helpers')
const { FeedId } = require('../lib/cipherlinks')

/*
test('publish (to groupId)', t => {
  const server = Server()

  server.private2.group.create('waynes world', (err, data) => {
    if (err) throw err

    const { groupId } = data

    const content = {
      type: 'announce',
      text: 'summer has arrived in wellington!',
      recps: [groupId]
    }

    server.publish(content, (err, msg) => {
      if (err) throw err

      t.true(msg.value.content.endsWith('.box2'), 'publishes envelope cipherstring')

      server.get({ id: msg.key, private: true, meta: true }, (err, msg) => {
        if (err) throw err

        t.deepEqual(msg.value.content, content, 'can open envelope!')

        server.close(() => {
          console.log('closed')
        })
        t.end()
      })
    })
  })
})
*/

test('publish (DM to feedId)', t => {
  const server = Server()

  server.private2.group.create('waynes world', (err, data) => {
    if (err) throw err

    const { groupId } = data
    const feedId = new FeedId().mock().toSSB()

    const content = {
      type: 'announce',
      text: 'summer has arrived in wellington!',
      recps: [groupId, feedId]
    }

    server.publish(content, (err, msg) => {
      t.error(err)

      t.true(msg.value.content.endsWith('.box2'), 'publishes envelope cipherstring')

      server.get({ id: msg.key, private: true, meta: true }, (err, msg) => {
        if (err) throw err

        t.deepEqual(msg.value.content, content, 'can open envelope!')

        server.close(() => {
          console.log('closed')
        })
        t.end()
      })
    })
  })
})
