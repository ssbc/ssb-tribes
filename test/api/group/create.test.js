const test = require('tape')
const { Server } = require('../../helpers')
const isCloaked = require('../../../lib/is-cloaked-msg-id')

test('private2.group.create', t => {
  const server = Server()

  // this is more of an integration test over the api
  server.private2.group.create(null, (err, data) => {
    if (err) throw err

    const { groupId, groupKey } = data
    t.true(isCloaked(groupId), 'returns group identifier - groupId')
    t.true(Buffer.isBuffer(groupKey) && groupKey.length === 32, 'returns group symmetric key - groupKey')

    server.close()
    t.end()
  })
})
