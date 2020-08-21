const test = require('tape')
const { Server, replicate } = require('../../helpers')
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
  const name = (id) => {
    switch (id) {
      case kaitiaki.id: return 'kaitiaki'
      case stranger.id: return 'stranger'
      default: return 'unknown'
    }
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
    const applicationData = await createApplication(groupId, admins, { text: text1 })
    await createApplication(groupId2, admins, { text: text1 })
    await createApplication(groupId3, admins, { text: text1 })

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
    t.equal(listData[0].id, applicationData.id, 'kaitiaki can see same application')

    const listData2 = await p(stranger.tribes.application.list)({})
    console.log(listData2)

    /* Stranger closes + restarts server */
    await p(stranger.close)()
    stranger = Server({ ...strangerOpts, startUnclean: true })

    /* Stranger checks list of applications */
    const listData3 = await p(stranger.tribes.application.list)({})
    t.deepEqual(listData2, listData3, 'stranger list same after restart')

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
    kaitiaki.close()
    stranger.close()
    t.error(error, 'should not error')
    t.end()
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
