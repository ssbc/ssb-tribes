const applicationSpec = require('../../spec/application/application')

module.exports = function AcceptGroupApplication (server) {
  return function acceptGroupApplication (applicationId, text, cb) {
    server.tribes.application.get(applicationId, (getErr, applicationData) => {
      const groupId = applicationData.content.groupId
      const recps = applicationData.content.recps
      server.tribes.invite(groupId, recps, { text }, (err, invite) => {
        const content = {
          type: 'group/application',
          version: 'v1',
          addMember: {
            add: invite.key
          },
          recps,
          tangles: {
            application: {
              root: applicationId,
              previous: [applicationData.key]
            }
          }
        }
        if (!applicationSpec.isValid(content)) {
          return cb(applicationSpec.isValid.errors)
        }
        server.publish(content, cb)
      })
    })
  }
}
