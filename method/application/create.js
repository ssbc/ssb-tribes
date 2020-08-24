const { isCloakedMsgId: isGroupId } = require('ssb-ref')
const { isRoot: isValid } = require('../../spec/application')

module.exports = function CreateGroupApplication (server) {
  return function createGroupApplication (groupId, groupAdmins, { text }, cb) {
    if (!isGroupId(groupId)) return cb(new Error('expects a valid groupId'))

    const applicationMessage = {
      type: 'group/application',
      version: 'v1',
      groupId,
      recps: [...groupAdmins, server.id],
      comment: { append: text },
      tangles: {
        application: { root: null, previous: null }
      }
    }
    if (!isValid(applicationMessage)) return cb(isValid.errors)

    server.publish(applicationMessage, (appErr, appData) => {
      if (appErr) return cb(appErr)
      server.tribes.application.get(appData.key, (_, finalData) => {
        cb(_, finalData)
      })
    })
  }
}
