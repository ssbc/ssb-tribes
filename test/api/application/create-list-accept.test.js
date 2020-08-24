const test = require('tape')
const { Server, replicate } = require('../../helpers')
const { isMsg } = require('ssb-ref')
const keys = require('ssb-keys')
const { promisify: p } = require('util')

// const sleep = async (t) => new Promise(resolve => setTimeout(resolve, t))

const text1 = 'Hello, can I join?'
const text2 = 'Welcome!'
const text3 = 'Welcome for a second time!'

test('tribes.application.*', async t => {
  const strangerOpts = {
    name: 'stranger-test-' + Date.now(),
    keys: keys.generate()
  }
  const kaitiakiOpts = {
    name: 'kaitiaki-test-' + Date.now(),
    keys: keys.generate()
  }
  var kaitiaki = Server(kaitiakiOpts)
  var stranger = Server(strangerOpts)
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

  replicate({ from: stranger, to: kaitiaki, name })
  replicate({ from: kaitiaki, to: stranger, name })

  try {
    /* Kaitiaki creates many tribes */
    const createTribe = p(kaitiaki.tribes.create)
    const { groupId } = await p(kaitiaki.tribes.create)({})
    const { groupId: groupId2 } = await createTribe({})
    const { groupId: groupId3 } = await createTribe({})
    const { groupId: groupId4 } = await createTribe({})
    const { groupId: groupId5 } = await createTribe({})
    const { groupId: groupId6 } = await createTribe({})

    /* User lists tribes it's part of */
    const initialList = await p(stranger.tribes.list)()
    t.equal(
      initialList.length,
      0,
      'tribes.list shows stranger is not part of group'
    )
    /* Stranger creates an application to join 3 tribes */
    const admins = [kaitiaki.id]
    const createApplication = p(stranger.tribes.application.create)
    let application = await createApplication(groupId, admins, { text: text1 })
    await createApplication(groupId2, admins, { text: text1 })
    await createApplication(groupId3, admins, { text: text1 })

    t.true(isMsg(application.id), 'application has an id')
    t.deepEqual(
      application.comments[0],
      { authorId: stranger.id, text: text1 },
      'application has initial comment'
    )
    /* Kaitiaki lists applications for a tribe */
    const listData = await p(kaitiaki.tribes.application.list)({
      groupId,
      accepted: false
    })
    t.deepEqual(listData[0], application, 'kaitiaki can see same application')

    const listData2 = await p(stranger.tribes.application.list)({})

    /* Stranger closes + restarts server */
    await p(stranger.close)()
    stranger = Server({ ...strangerOpts, startUnclean: true })
    // have to restart replication after closing server
    replicate({ from: kaitiaki, to: stranger, name })

    /* Stranger checks list of applications */
    const listData3 = await p(stranger.tribes.application.list)({})
    t.deepEqual(listData2, listData3, 'stranger list same after restart')

    /* Kaitiaki accepts the application */
    const acceptData = await p(kaitiaki.tribes.application.accept)(
      listData[0].id,
      { text: text2 }
    )
    t.true(isMsg(acceptData.addMember[0]), 'group/add-member message sent')

    /* Stranger checks the current application state */
    const getData = await p(stranger.tribes.application.get)(application.id)

    t.deepEqual(
      getData.comments[1],
      { authorId: kaitiaki.id, text: text2 },
      'stranger can see comment from kaitiaki'
    )
    t.equal(getData.addMember.length, 1, 'stranger can see group/add-member')

    /* User can now publish to group */
    const published = await p(stranger.publish)({ type: 'hooray', recps: [groupId] })
    t.true(published, 'stranger can now publish to group')

    /* Duplicate acceptance */
    await p(kaitiaki.tribes.application.accept)(
      listData[0].id,
      { text: text3 }
    )

    application = await p(stranger.tribes.application.get)(application.id)
    t.deepEqual(
      application.comments,
      [
        { authorId: stranger.id, text: text1 },
        { authorId: kaitiaki.id, text: text2 },
        { authorId: kaitiaki.id, text: text3 }
      ],
      'stranger sees all comments'
    )

    finish()
  } catch (err) {
    finish(err)
  }
})
