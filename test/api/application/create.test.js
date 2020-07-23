const test = require('tape')
const { Server } = require('../../helpers')

test('tribes.application.create', t => {
  const kaitiaki = Server({ name: 'createGroup' })
  const server = Server({ name: 'createApplication' })
  /* Kaitiaki creates a group */
  kaitiaki.tribes.create('the pantheon', (groupErr, groupData) => {
    t.error(groupErr)
    const recps = [kaitiaki.id, server.id]
    /* User creates an application to join group */
    server.tribes.application.create(
      groupData.groupId,
      recps,
      'Hello, can I join?',
      (applicationErr, applicationData) => {
        console.log('applicationData', applicationData)
        t.error(applicationErr)
        t.equal(typeof applicationData, 'object')
        t.equal(typeof applicationData.key, 'string')
        t.equal(typeof applicationData.content, 'object')
        t.equal(typeof applicationData.content.tangles, 'object')
        /* Kaitiaki lists group applications for a group */
        kaitiaki.tribes.application.list(groupData.groupId, (listErr, listData) => {
          console.log('listData', listData)
        })
        // kaitiaki.tribes.application.accept(applicationData.key, 'Welcome!', (acceptErr, acceptData) => {
        //   t.error(acceptErr)
        //   console.log('acceptErr, acceptData', acceptErr, acceptData)
        //   server.tribes.application.get(applicationData.key, {}, (getError, getData) => {
        //     t.error(getError)
        //     console.log('getData', getData)
        //     const expected = {
        //       type: 'group/application',
        //       version: 'v1',
        //       // recps: [authorIds],
        //       tangles: {
        //         application: {
        //           root: applicationData.value.previous,
        //           previous: [applicationData.value.previous]
        //         },
        //         group: {
        //           root: groupData.groupInitMsg.key,
        //           previous: [applicationData.value.previous]
        //         }
        //       }
        //     }
        //     t.deepEqual(getData.content, expected, 'create and get group application')
        //     server.close()
        //     t.end()
        //   })
        // })
      }
    )
  })
})
