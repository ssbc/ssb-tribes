const test = require('tape')
const { promisify: p } = require('util')

const { Server } = require('../../helpers')

test('tribes.poBox.get', async t => {
  t.plan(1)
  const server = Server({ debug: !true })
  const { groupId, poBoxId } = await p(server.tribes.create)({ addPOBox: true })

  const keys = await p(server.tribes.poBox.get)(groupId)

  t.equal(keys.poBoxId, poBoxId, 'fetch poBoxId by groupId')

  server.close()
})
