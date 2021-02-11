const test = require('tape')
const { promisify: p } = require('util')
const { Server, GroupId, replicate } = require('../../helpers')

test('tribes.application.get', async t => {
  const alice = Server()
  const kaitiaki = Server()

  const adminIds = [kaitiaki.id]
  const groupId = GroupId()
  const answers = [
    { q: 'what is your favourate pizza flavour', a: 'hawaiian' }
  ]
  const comment = "p.s. I'm also into adding chilli to hawaiin!"

  const id = await p(alice.tribes.application.create)(groupId, adminIds, { answers })
  const t1 = (await p(alice.get)(id)).timestamp

  const update1 = await p(alice.tribes.application.update)(id, { comment })
  const t2 = (await p(alice.get)(update1)).timestamp

  /* kaitiaki approves */
  await p(replicate)({ from: alice, to: kaitiaki })

  const tipId = await p(kaitiaki.tribes.application.update)(id, {
    decision: { accepted: true },
    comment: 'WELCOME!'
  })
  const t3 = (await p(kaitiaki.get)(tipId)).timestamp

  await p(replicate)({ from: kaitiaki, to: alice })

  const application = await p(alice.tribes.application.get)(id)

  const expected = {
    id,
    groupId,
    applicantId: alice.id,
    groupAdmins: [kaitiaki.id],

    answers: [
      {
        q: 'what is your favourate pizza flavour',
        a: 'hawaiian'
      }
    ],
    decision: { accepted: true },

    // this section was materialised from the other mutable sections
    // using some getTransformation trickery
    history: [
      {
        type: 'answers',
        author: alice.id,
        timestamp: t1,
        body: [
          {
            q: 'what is your favourate pizza flavour',
            a: 'hawaiian'
          }
        ]
      },
      {
        type: 'comment',
        author: alice.id,
        timestamp: t2,
        body: "p.s. I'm also into adding chilli to hawaiin!"
      },
      {
        type: 'comment',
        author: kaitiaki.id,
        timestamp: t3,
        body: 'WELCOME!'
      },
      {
        type: 'decision',
        author: kaitiaki.id,
        timestamp: t3,
        body: { accepted: true }
      }
    ]
  }

  t.deepEqual(application, expected, 'gets application')

  alice.close()
  kaitiaki.close()
  t.end()
})
