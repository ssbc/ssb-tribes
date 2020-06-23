const test = require('tape')
const { Server, GroupId } = require('./helpers')
const { FeedId } = require('../lib/cipherlinks')

test('publish (to groupId)', t => {
  const server = Server()

  server.tribes.create(null, (err, data) => {
    t.error(err)

    const { groupId } = data

    const content = {
      type: 'announce',
      text: 'summer has arrived in wellington!',
      recps: [groupId]
    }

    server.publish(content, (err, msg) => {
      t.error(err)
      t.true(msg.value.content.endsWith('.box2'), 'publishes envelope cipherstring')

      server.get({ id: msg.key, private: true, meta: true }, (err, msg) => {
        t.error(err)
        t.deepEqual(msg.value.content, content, 'can open envelope!')

        server.close()
        t.end()
      })
    })
  })
})

test('publish (to groupId we dont have key for)', t => {
  const server = Server()
  const groupId = GroupId()

  const content = {
    type: 'announce',
    text: 'summer has arrived in wellington!',
    recps: [groupId]
  }

  server.publish(content, (err) => {
    t.match(err.message, /unknown groupId/, 'returns error')
    server.close()
    t.end()
  })
})

test('publish (DM to feedId)', t => {
  const server = Server()

  server.tribes.create(null, (err, data) => {
    t.error(err)

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
        t.error(err)
        t.deepEqual(msg.value.content, content, 'can open envelope!')

        server.close(() => {
          console.log('closed')
        })
        t.end()
      })
    })
  })
})
