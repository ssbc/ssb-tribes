const test = require('tape')
const { isCloakedMsg: isGroup } = require('ssb-ref')
const { Server } = require('../helpers')

test('tribes.create', t => {
  t.plan(2)
  const server = Server()

  // this is more of an integration test over the api
  server.tribes.create(null, (err, data) => {
    if (err) throw err

    const { groupId, groupKey } = data
    t.true(isGroup(groupId), 'returns group identifier - groupId')
    t.true(Buffer.isBuffer(groupKey) && groupKey.length === 32, 'returns group symmetric key - groupKey')

    server.close()
  })
})
