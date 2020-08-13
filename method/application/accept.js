const { isUpdate: isValid } = require('../../spec/application')

module.exports = function AcceptGroupApplication (server) {
  return function acceptGroupApplication (id, { text }, cb) {
    server.tribes.application.get(id, (getErr, applicationData) => {
      const { groupId, applicantId, groupAdmins } = applicationData

      server.tribes.invite(groupId, [applicantId], { text }, (err, invite) => {
        if (err) return cb(err)

        const content = {
          type: 'group/application',
          version: 'v1',
          addMember: { [invite.key]: 1 },
          comment: { append: text },
          recps: [applicantId, ...groupAdmins],
          tangles: {
            application: {
              root: id,
              previous: [id]
            }
          }
        }
        if (!isValid(content)) return cb(isValid.errors)

        server.publish(content, (err, publishData) => {
          if (err) return cb(err)

          server.tribes.application.get(id, cb)
        })
      })
    })
  }
}
