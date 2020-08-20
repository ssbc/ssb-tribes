const test = require('tape')
const { Server, replicate } = require('../../helpers')
const pull = require('pull-stream')
const { isMsg } = require('ssb-ref')
const keys = require('ssb-keys')
const { promisify: p } = require('util')

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

  pull(
    stranger.createUserStream({ id: stranger.id, live: true }),
    pull.filter(m => !m.sync),
    pull.drain(m => {
      kaitiaki.add(m.value, err => {
        if (err) throw err
      })
    })
  )

  pull(
    kaitiaki.createUserStream({ id: kaitiaki.id, live: true }),
    pull.filter(m => !m.sync),
    pull.drain(m => {
      stranger.add(m.value, err => {
        if (err) throw err
      })
    })
  )

  var applicationId

  try {
    /* Kaitiaki creates many tribes */
    const { groupId } = await p(kaitiaki.tribes.create)('the pantheon')
    const { groupId: groupId2 } = await p(kaitiaki.tribes.create)(
      'the pantheon 2'
    )
    const { groupId: groupId3 } = await p(kaitiaki.tribes.create)(
      'the pantheon 3'
    )
    const { groupId: groupId4 } = await p(kaitiaki.tribes.create)(
      'the pantheon 4'
    )
    const { groupId: groupId5 } = await p(kaitiaki.tribes.create)(
      'the pantheon 5'
    )
    const { groupId: groupId6 } = await p(kaitiaki.tribes.create)(
      'the pantheon 6'
    )
    /* User lists tribes it's part of */
    const initialList = await p(stranger.tribes.list)()
    t.equal(
      initialList.length,
      0,
      'tribes.list shows stranger is not part of group'
    )
    /* User creates an application to join 3 tribes */
    const admins = [kaitiaki.id]
    const applicationData = await p(stranger.tribes.application.create)(
      groupId,
      admins,
      { text: text1 }
    )
    await p(stranger.tribes.application.create)(groupId2, admins, {
      text: text1
    })
    await p(stranger.tribes.application.create)(groupId3, admins, {
      text: text1
    })
    applicationId = applicationData.id
    t.true(isMsg(applicationData.id), 'application has an id')
    t.deepEqual(
      applicationData.comments[0],
      { authorId: stranger.id, text: text1 },
      'application has initial comment'
    )
    /* Kaitiaki lists applications for a tribe */
    const listData = await p(kaitiaki.tribes.application.list)({
      groupId,
      accepted: false
    })
    t.equal(listData[0].id, applicationId, 'kaitiaki can see same application')
    /* User disconnects and reconnects */
    await p(stranger.close)()
    var stranger = await Server({ ...strangerOpts, startUnclean: true })
    /* User checks list of applications */
    const reconnectedListData = await p(stranger.tribes.application.list)({
      groupId: undefined,
      accepted: undefined
    })
    console.log('reconnectedListData', reconnectedListData)

    /* Kaitiaki accepts the application */
    const acceptData = await p(kaitiaki.tribes.application.accept)(
      listData[0].id,
      { text: text2 }
    )
    t.equal(acceptData.addMember.length, 1, 'group/add-member message sent')

    /* User checks the current application state */
    const getData = await p(stranger.tribes.application.get)(applicationData.id)
    t.deepEqual(
      getData.comments[1],
      { authorId: kaitiaki.id, text: text2 },
      'can see comment from kaitiaki'
    )
    t.equal(acceptData.addMember.length, 1, 'can see have been invited')

    /* User can now publish to group */
    // stranger.publish(
    //   { type: 'hooray', recps: [groupId] },
  } catch (error) {
    t.error(error, 'should not error')
  }
})

// catch (error) {
//   t.error(error, 'kaitiaki can call up application')
// }

//             ,
//             (listErr, listData) => {

//                 ,
//                 (err, acceptData) => {
//                   t.error(err, 'kaitiaki accepts')

//                     (err, getData) => {
//                       t.error(
//                         err,
//                         'stranger checks current state of application'
//                       )

//                         err => {
//                           t.error(
//                             err,
//                             'stranger is now part of group and can publish to it!'
//                           )

//                           /* Kaitiaki creates a second accept message */
//                           kaitiaki.tribes.application.accept(
//                             listData[0].id,
//                             { text: text3 },
//                             (err, acceptData2) => {
//                               t.error(err, 'second acceptance')

//                               /* Kaitiaki checks list of applications */
//                               kaitiaki.tribes.application.list(
//                                 {},
//                                 (err, upListData) => {
//                                   t.error(
//                                     err,
//                                     'kaitiaki check all applications'
//                                   )

//                                   t.deepEqual(
//                                     upListData[0].comments,
//                                     [
//                                       { authorId: stranger.id, text: text1 },
//                                       { authorId: kaitiaki.id, text: text2 },
//                                       { authorId: kaitiaki.id, text: text3 }
//                                     ],
//                                     'kaitiaki sees all comments'
//                                   )
//                                   kaitiaki.close()
//                                   stranger.close()
//                                   t.end()
//                                 }
//                               )
//                             }
//                           )
//                         }
//                       )
//                     }
//                   )
//                 }
//               )
//             }
//           )
//         }
//       )
//     })
//   })
// })
