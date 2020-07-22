const test = require('tape')
const { Server } = require('../../helpers')
const { FeedId } = require('../../../lib/cipherlinks')
const accept = require('../../../method/application/accept')

test('tribes.application.create', t => {
  const server = Server({ name: 'createApplication' })
  const authorId = new FeedId().mock().toSSB()
  // this is more of an integration test over the api
  server.tribes.create('the pantheon', (groupErr, groupData) => {
    t.error(groupErr)
    server.tribes.application.create(
      groupData.groupId,
      authorId,
      'Hello!',
      (applicationErr, applicationData) => {
        // console.log('applicationData', applicationData)
        t.error(applicationErr)
        t.equal(typeof applicationData, 'object')
        t.equal(typeof applicationData.content.root, 'string')
        t.equal(typeof applicationData.content, 'object')
        t.equal(typeof applicationData.content.tangles, 'object')
        server.tribes.application.accept(applicationData.content.root, 'Welcome!', (acceptErr, acceptData) => {
          t.error(acceptErr)
          console.log('acceptErr, acceptData', acceptErr, acceptData)
          server.tribes.application.get(applicationData.key, {}, (getError, getData) => {
            console.log('getData', getData)
            const expected = {
              type: 'group/application',
              version: 'v1',
              recps: [groupData.groupId, authorId],
              tangles: {
                application: {
                  root: applicationData.value.previous,
                  previous: [applicationData.value.previous]
                },
                group: {
                  root: groupData.groupInitMsg.key,
                  previous: [applicationData.value.previous]
                }
              }
            }
            t.deepEqual(getData.content, expected, 'create and get group application')
            server.close()
            t.end()
          })
        })
      }
    )
  })
})
