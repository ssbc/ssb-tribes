const test = require('tape')
const { promisify: p } = require('util')
const { Server, GroupId } = require('../../helpers')

test('tribes.application.tombstone', async t => {
  const alice = Server({ application: true })
  const kaitiaki = Server({ application: true })

  const adminIds = [kaitiaki.id]
  kaitiaki.close()
  const groupId = GroupId()
  const answers = [
    { q: 'what is your favourate pizza flavour', a: 'hawaiian' }
  ]

  const id = await p(alice.tribes.application.create)(groupId, adminIds, { answers })
  await p(alice.tribes.application.tombstone)(id, { reason: 'migration' })

  const application = await p(alice.tribes.application.get)(id)
  t.true(application.tombstone, 'tombstoned!')

  const list = await p(alice.tribes.application.list)({ groupId, accepted: null })
  t.equal(list.length, 0, 'no longer shows up on listed applications')

  alice.close()
  t.end()
})
