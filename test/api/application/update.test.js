const test = require('tape')
const { promisify: p } = require('util')
const { Server, GroupId, replicate } = require('../../helpers')

test('tribes.application.update', async t => {
  const alice = Server()
  const kaitiaki = Server()

  const adminIds = [kaitiaki.id]
  const groupId = GroupId()
  const answers = [
    { q: 'what is your favourate pizza flavour', a: 'hawaiian' }
  ]
  const comment = "p.s. I'm also into adding chilli to hawaiin!"

  const id = await p(alice.tribes.application.create)(groupId, adminIds, { answers })

  const updateId = await p(alice.tribes.application.update)(id, { comment })

  const val = await p(alice.get)({ id: updateId, private: true })
  t.deepEqual(
    val.content,
    {
      type: 'group/application',
      comment: { set: comment },
      recps: [...adminIds, alice.id],
      tangles: {
        application: { root: id, previous: [id] }
      }
    },
    'original applicant can update'
  )

  /* alice cannot approve */
  const decision = { approved: true }
  let res
  try {
    res = await p(alice.tribes.application.update)(id, { decision })
  } catch (err) {
    t.match(err.message, /Invalid update message/, 'applicant cannot publish decision')
  }
  if (res) t.fail('alice should not be allowed to decide!')

  /* kaitiaki can approve */

  await p(replicate)({ from: alice, to: kaitiaki })

  res = await p(kaitiaki.tribes.application.update)(id, { decision })

  t.true(res, 'kaitiaki can publish decision')

  alice.close()
  kaitiaki.close()
  t.end()
})
