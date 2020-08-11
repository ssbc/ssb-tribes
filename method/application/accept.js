const applicationSpec = require('../../spec/application/application')

module.exports = function AcceptGroupApplication (server) {
  return function acceptGroupApplication (applicationId, { text }, cb) {
    server.tribes.application.get(applicationId, (getErr, applicationData) => {
      const { groupId, recps } = applicationData
      server.tribes.invite(groupId, recps, { text }, (err, invite) => {
        const content = {
          type: 'group/application',
          version: 'v1',
          addMember: {
            add: invite.key
          },
          text: {
            append: text
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
        server.publish(content, (_, publishData) => {
          server.tribes.application.get(applicationId, cb)
        })
      })
    })
  }
}
