const test = require('tape')
const { Server, GroupKey, GroupId } = require('./helpers')

test('publish', t => {
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
