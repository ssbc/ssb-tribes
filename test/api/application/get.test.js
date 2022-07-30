const test = require('tape')
const keys = require('ssb-keys')
const { promisify: p } = require('util')
const { Server, GroupId, replicate } = require('../../helpers')

const emptyFields = {
  decision: null,
  tombstone: null
}

test('tribes.application.get (v2.1 application)', async t => {
  const alice = Server()
  const kaitiaki = Server()

  const adminIds = [kaitiaki.id]
  const groupId = GroupId()
  const answers = [
    { q: 'what is your favourate pizza flavour', a: 'hawaiian' }
  ]
  const comment = "p.s. I'm also into adding chilli to hawaiin!"
  const profileId = '%FiR41bB1CrsanZA3VgAzoMmHEOl8ZNXWn+GS5vW3E/8=.sha256'

  let id, update1, application
  let t1, t2, t3
  try {
    id = await p(alice.tribes.application.create)(groupId, adminIds, { answers, profileId })
    t1 = (await p(alice.get)(id)).timestamp

    update1 = await p(alice.tribes.application.update)(id, { comment })
    t2 = (await p(alice.get)(update1)).timestamp

    /* kaitiaki approves */
    await p(replicate)({ from: alice, to: kaitiaki })

    const tipId = await p(kaitiaki.tribes.application.update)(id, {
      decision: { accepted: true },
      comment: 'WELCOME!'
    })
    t3 = (await p(kaitiaki.get)(tipId)).timestamp

    await p(replicate)({ from: kaitiaki, to: alice })

    application = await p(alice.tribes.application.get)(id)
  } catch (err) {
    t.fail(err)
  }

  const expected = {
    ...emptyFields,
    id,
    groupId,
    applicantId: alice.id,
    profileId,
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

test('tribes.application.get (v2 application)', async t => {
  const server = Server()

  const groupId = GroupId()
  const groupAdmins = [keys.generate().id]
  const answers = [
    { q: 'what is your favourate pizza flavour', a: 'hawaiian' }
  ]
  const comment = "p.s. I'm also into adding chilli to hawaiin!"

  const v2RootNodeT = {
    type: 'group/application',
    groupId,
    version: 'v2', // use old version of applications
    answers: { set: answers },
    comment: { set: comment },
    recps: [...groupAdmins, server.id], // adminIds
    tangles: { application: { root: null, previous: null } }
  }

  server.publish(v2RootNodeT, (err, m) => {
    if (err) throw err

    server.tribes.application.get(m.key, (err, state) => {
      t.error(err, 'can still get v2 applications')

      t.deepEqual(
        state,
        {
          ...emptyFields,
          id: m.key,
          groupId,
          profileId: null, // wasnt set in old version
          applicantId: server.id,
          groupAdmins,
          answers,
          decision: null,
          history: [
            {
              type: 'answers',
              author: server.id,
              timestamp: state.history[0].timestamp,
              body: answers
            },
            {
              type: 'comment',
              author: server.id,
              timestamp: state.history[1].timestamp,
              body: comment
            }
          ]
        },
        'returns correctly formated application'
      )
      server.close()
      t.end()
    })
  })
})

test('tribes.application.get (v1 application)', t => {
  const ssb = Server()

  const v1RootNodeT = {
    type: 'group/application',
    version: 'v1',
    groupId: '%EPdhGFkWxLn2k7kzthIddA8yqdX8VwjmhmTes0gMMqE=.cloaked',
    recps: [
      '@rHfP8mgPkmWT+KYkNoQMef+dFJLD3wi4gVdU+1LoABI=.ed25519',
      ssb.id
    ],
    text: { append: 'hello' },
    tangles: { application: { root: null, previous: null } }
  }

  ssb.publish(v1RootNodeT, (err, m) => {
    if (err) throw err

    ssb.tribes.application.get(m.key, (err) => {
      t.match(err.message, /not a valid group\/application/)
      ssb.close()
      t.end()
    })
  })
})
