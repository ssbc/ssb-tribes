const test = require('tape')
const { promisify: p } = require('util')
const { Server, GroupId, replicate } = require('../../helpers')

test('tribes.application.reject', async t => {
  const alice = Server({ application: true })
  const kaitiaki = Server({ application: true })

  const adminIds = [kaitiaki.id]
  const groupId = GroupId()
  const answers = [
    { q: 'what is your favourate pizza flavour', a: 'hawaiian' }
  ]

  let id, reason, rejectId, val
  try {
    id = await p(alice.tribes.application.create)(groupId, adminIds, { answers })
    await p(replicate)({ from: alice, to: kaitiaki })

    reason = 'hey this group is no longer accepting new people'
    rejectId = await p(kaitiaki.tribes.application.reject)(id, { reason })

    val = await p(kaitiaki.get)({ id: rejectId, private: true })
  } catch (err) {
    t.fail(err)
  }

  t.deepEqual(
    val.content,
    {
      type: 'group/application',
      comment: { set: reason },
      decision: { set: { accepted: false } },
      recps: [...adminIds, alice.id],
      tangles: {
        application: { root: id, previous: [id] }
      }
    },
    'reject works'
  )

  // TODO - reject if there's already a known accept?

  alice.close()
  kaitiaki.close()
  t.end()
})
