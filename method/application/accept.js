const pull = require('pull-stream')

module.exports = function AcceptGroupApplication (server) {
  return function acceptGroupApplication (applicationId, text, cb) {
    console.log('acceptGroupApplication -> applicationId', applicationId)
    // const query = [{
    //   $filter: { dest: applicationId }
    // }]
    // pull(
    //   server.backlinks.read({ query }),
    //   pull.collect((err, msgs) => {
    //     console.log('ERR ON BACLINK', err)
    //     console.log('acceptGroupApplication -> msg', msgs)
    //     cb(err, msgs)
    //   })
    // )

    server.get({ id: applicationId, private: true }, (_, applicationData) => {
      console.log('acceptGroupApplication -> applicationData', applicationData)
      const groupId = applicationData.content.recps[0] // IS THIS RIGHT?
      const applicantId = applicationData.content.recps[1] // IS THIS RIGHT?
      server.tribes.invite(groupId, [applicantId], { text }, (err, invite) => {
        console.log('acceptGroupApplication -> err, invite', err, invite)
        const content = {
          type: 'group/application',
          version: 'v1',
          addMember: {
            add: invite.key
          },
          recps: applicationData.content.recps,
          tangles: {
            application: {
              root: applicationId, // IS THIS RIGHT?
              previous: [applicationData.content.tangles.application.previous] // IS THIS RIGHT?
            }
          }
        }
        if (!applicationSpec.isValid(content)) { return cb(applicationSpec.isValid.errors) }
        server.publish(content, cb)
      })
    })
  }
}
