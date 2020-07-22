const pull = require('pull-stream')
const applicationSpec = require('../../spec/application/application')

module.exports = function AcceptGroupApplication (server) {
  return function acceptGroupApplication (applicationId, text, cb) {
    console.log('GOT HERE', applicationId)
    function createBacklinkStream (id) {
      var filterQuery = {
        $filter: {
          dest: id
        }
      }

      return server.backlinks.read({
        query: [filterQuery],
        index: 'DTA', // use asserted timestamps
        live: true
      })
    }
    pull(
      createBacklinkStream(applicationId),
      pull.filter(msg => !msg.sync),
      pull.drain(msg => {
        console.log('acceptGroupApplication -> msg', msg)
        // relatedMessages.push(msg)
      })
    )

    // server.get({ id: applicationId, private: true }, (_, applicationData) => {
    //   console.log('acceptGroupApplication -> applicationId', applicationId)
    //   console.log('TANGLES', applicationData.content.tangles.application)
    //   const groupId = applicationData.content.recps[0] // IS THIS RIGHT?
    //   const applicantId = applicationData.content.recps[1] // IS THIS RIGHT?
    //   server.tribes.invite(groupId, [applicantId], { text }, (err, invite) => {
    //     console.log('acceptGroupApplication -> err, invite', err, invite)
    //     const content = {
    //       type: 'group/application',
    //       version: 'v1',
    //       addMember: {
    //         add: invite.key
    //       },
    //       recps: applicationData.content.recps,
    //       tangles: {
    //         application: {
    //           root: applicationId, // IS THIS RIGHT?
    //           previous: [applicationData.content.tangles.application.previous] // IS THIS RIGHT?
    //         }
    //       }
    //     }
    //     if (!applicationSpec.isValid(content)) { return cb(applicationSpec.isValid.errors) }
    //     server.publish(content, cb)
    //   })
    // })
  }
}
