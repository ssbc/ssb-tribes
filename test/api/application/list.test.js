const test = require('tape')
const { isMsg } = require('ssb-ref')
const keys = require('ssb-keys')
const { promisify: p } = require('util')
const { Server, replicate } = require('../../helpers')

// const sleep = async (t) => new Promise(resolve => setTimeout(resolve, t))

const text1 = 'Hello, can I join?'
const text2 = 'Welcome!'
const text3 = 'Welcome for a second time!'

test('tribes.application.list (v2.1 application)', async t => {
  const strangerOpts = {
    name: 'stranger-test-' + Date.now(),
    keys: keys.generate()
  }
  const kaitiakiOpts = {
    name: 'kaitiaki-test-' + Date.now(),
    keys: keys.generate()
  }
  const kaitiaki = Server(kaitiakiOpts)
  let stranger = Server(strangerOpts)
  const name = (id) => {
    switch (id) {
      case kaitiaki.id: return 'kaitiaki'
      case stranger.id: return 'stranger'
      default: return 'unknown'
    }
  }

  const finish = (err) => {
    kaitiaki.close()
    stranger.close()
    t.error(err, 'saw no errors')
    t.end()
  }
  replicate({ from: stranger, to: kaitiaki, name, live: true })
  replicate({ from: kaitiaki, to: stranger, name, live: true })

  try {
    /* Kaitiaki creates many tribes */
    const createTribe = p(kaitiaki.tribes.create)
    const groups = await Promise.all([
      createTribe({}),
      createTribe({}),
      createTribe({}),
      createTribe({})
    ])
    const groupIds = groups.map(g => g.groupId)
    const [groupId, groupId2, groupId3] = groupIds

    /* User lists tribes it's part of */
    const initialList = await p(stranger.tribes.list)()
    t.equal(initialList.length, 0, 'stranger sees no applications')

    /* Stranger creates an application to join 3 tribes */
    const admins = [kaitiaki.id]
    const createApplication = p(stranger.tribes.application.create)
    const applications = await Promise.all([
      createApplication(groupId, admins, { comment: text1 }),
      createApplication(groupId2, admins, { comment: text1 }),
      createApplication(groupId3, admins, { comment: text1 })
    ])

    t.true(
      applications.every(a => isMsg(a)),
      'stranger makes some applications'
    )
    let application = await p(stranger.tribes.application.get)(applications[0])

    /* Kaitiaki lists applications for a tribe */
    let listData = await p(kaitiaki.tribes.application.list)({
      groupId,
      get: true,
      accepted: null // unresponded
    })
    t.deepEqual(listData, [application], 'kaitiaki can see same application')

    const listData2 = await p(stranger.tribes.application.list)({})

    /* Stranger closes + restarts server */
    await p(stranger.close)()
    stranger = Server({ ...strangerOpts, startUnclean: true })
    // have to restart replication after closing server

    replicate({ from: kaitiaki, to: stranger, name, live: true })

    /* Stranger checks list of applications */
    const listData3 = await p(stranger.tribes.application.list)({})
    t.deepEqual(listData2, listData3, 'stranger list same after restart')

    /* Kaitiaki accepts the application */

    await p(kaitiaki.tribes.application.accept)(
      listData[0].id,
      { applicationComment: text2 }
    )

    /* Stranger checks the current application state */
    // takes a moment for the stranger to process new membership
    let isReady = false
    while (!isReady) {
      application = await p(stranger.tribes.application.get)(application.id)
      isReady = application && application.history && application.history.length > 1

      if (!isReady) await wait(500)
    }

    t.deepEqual(
      application.history[1].body,
      text2,
      'stranger can see comment from kaitiaki'
    )
    t.true(isMsg(application.history[2].body.addMember), 'stranger can see group/add-member')

    /* User can now publish to group */
    // takes a moment for group/add-member to be read, keystore to be updated
    isReady = false
    while (!isReady) {
      const groups = await p(stranger.tribes.list)()
      isReady = groups.length

      if (!isReady) await wait(500)
    }
    const published = await p(stranger.publish)({ type: 'hooray', recps: [groupId] })
    t.true(published, 'stranger can now publish to group')

    /* Duplicate acceptance */
    await p(kaitiaki.tribes.application.accept)(
      listData[0].id,
      { applicationComment: text3 }
    )

    isReady = false
    while (!isReady) {
      application = await p(stranger.tribes.application.get)(application.id)
      isReady = application && application.history && application.history.length > 3

      if (!isReady) await wait(500)
    }

    t.deepEqual(
      application.history.map(h => {
        const _h = { author: h.author, body: h.body }
        delete h.body.addMember
        // just prune these links off as too hard / not relevant (and tested in accept)
        return _h
      }),
      [
        { author: stranger.id, body: text1 },
        { author: kaitiaki.id, body: text2 },
        { author: kaitiaki.id, body: { accepted: true } },
        { author: kaitiaki.id, body: text3 },
        { author: kaitiaki.id, body: { accepted: true } }
      ],
      'stranger sees all comments'
    )
    // This is really just testing READ, can delete
    // but it does test duplicate accept

    await p(kaitiaki.tribes.application.reject)(applications[0], {}) // already approved! rejection should do nothing
    await p(kaitiaki.tribes.application.reject)(applications[1], {})

    listData = await p(kaitiaki.tribes.application.list)({
      accepted: true // accepted
    })
    t.equal(listData.length, 1, 'kaitiaki sees 1 accepted applications')

    listData = await p(kaitiaki.tribes.application.list)({
      accepted: false // rejected
    })
    t.equal(listData.length, 1, 'kaitiaki sees 1 rejected applications')

    listData = await p(kaitiaki.tribes.application.list)({
      accepted: null // unresponded
    })
    t.equal(listData.length, 1, 'kaitiaki sees 1 applications with no decision')

    finish()
  } catch (err) {
    finish(err)
  }
})

test('tribes.application.list (v2 application)', t => {
  const ssb = Server()

  const v2RootNodeT = {
    type: 'group/application',
    version: 'v2',
    groupId: '%EPdhGFkWxLn2k7kzthIddA8yqdX8VwjmhmTes0gMMqE=.cloaked',
    recps: [
      '@rHfP8mgPkmWT+KYkNoQMef+dFJLD3wi4gVdU+1LoABI=.ed25519',
      ssb.id
    ],
    tangles: { application: { root: null, previous: null } }
  }

  ssb.publish(v2RootNodeT, (err, m) => {
    if (err) throw err

    ssb.tribes.application.list({}, (err, results) => {
      if (err) throw err

      t.deepEqual(results, [m.key], 'v2 applications are returned (only applicationId when opts={}')

      ssb.tribes.application.list({ get: true }, (err, results) => {
        if (err) throw err

        t.deepEqual(
          results,
          [{
            id: m.key,
            groupId: '%EPdhGFkWxLn2k7kzthIddA8yqdX8VwjmhmTes0gMMqE=.cloaked',
            profileId: null, // expect this because it didnt exist in v2
            applicantId: ssb.id,
            groupAdmins: ['@rHfP8mgPkmWT+KYkNoQMef+dFJLD3wi4gVdU+1LoABI=.ed25519'],
            answers: null,
            decision: null,
            history: []
          }],
          'v2 applications are returned when opts={get: true}'
        )

        ssb.close()
        t.end()
      })
    })
  })
})

test('tribes.application.list (v1 application)', t => {
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

    ssb.tribes.application.list({}, (err, results) => {
      if (err) throw err

      t.deepEqual(results, [], 'v1 applications are excluded (opts: {})')

      ssb.tribes.application.list({ get: true }, (err, results) => {
        if (err) throw err

        t.deepEqual(results, [], 'v1 applications are excluded (opts: { get: true })')

        ssb.close()
        t.end()
      })
    })
  })
})

function wait (time) {
  return new Promise((resolve, reject) => {
    setTimeout(() => resolve(), time)
  })
}
