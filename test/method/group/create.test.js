const test = require('tape')
const Server = require('../../server')

test('ssb.private2.group.create', t => {
  const server = Server()

  // hmmm ... think the raw method should be tested here
  // as in index.js we couple in the key-store
  server.private2.group.add('musk-rat paradise', (err, msg) => {
    server.close()

    t.equal(err === null, 'creates a new group')

  })

  t.end()
})
