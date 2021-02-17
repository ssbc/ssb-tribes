const test = require('tape')
const { promisify: p } = require('util')
const { Server, GroupId, replicate } = require('../../helpers')
const ApplicationSpec = require('../../../spec/application')
const Crut = require('ssb-crut')

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

test('v1 applications', t => {
  const v1RootNodeT = {
    type: 'group/application',
    version: 'v1',
    groupId: '%EPdhGFkWxLn2k7kzthIddA8yqdX8VwjmhmTes0gMMqE=.cloaked',
    recps: [
      '@58MByuWxOHWJmpXlVdhdWha0z/n2efYb0bR+hO2EBpQ=.ed25519',
      '@rHfP8mgPkmWT+KYkNoQMef+dFJLD3wi4gVdU+1LoABI=.ed25519'
    ],
    comment: { append: 'hello' },
    tangles: { application: { root: null, previous: null } },
    history: {
      '0000-1605139400278-@rHfP8mgPkmWT+KYkNoQMef+dFJLD3wi4gVdU+1LoABI=.ed25519-0': {
        type: 'comment',
        author: '@rHfP8mgPkmWT+KYkNoQMef+dFJLD3wi4gVdU+1LoABI=.ed25519',
        timestamp: 1605139400278,
        body: undefined
      }
    }
  }

  const ssb = Server()

  // run it through the spec
  const crut = new Crut(ssb, ApplicationSpec)

  t.true(crut.spec.isRoot(v1RootNodeT), 'old v1 items should pass the new spec')
  t.error(crut.spec.isRoot.errorsString, 'spec.isRoot returns no errors')

  ssb.close()
  t.end()
})
