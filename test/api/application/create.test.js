const test = require('tape')
const { Server } = require('../../helpers')
const { isCloakedMsg: isGroup } = require('ssb-ref')

test('tribes.application.create', t => {
  const server = Server({ name: 'createApplication' })

  // this is more of an integration test over the api
  server.tribes.create('the pantheon', (err, data) => {
    t.error(err)
    console.log(data)
    server.tribes.application.create(data.groupId, 'Hello!', (err, data) => {
      console.log('GOTTTT', err, data)
      if (err) throw err
      t.equal(data, true)
      server.close()
      t.end()
    })
  })
})
