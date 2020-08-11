const { isCloakedMsgId: isGroupId } = require('ssb-ref')
const applicationSpec = require('../../spec/application/application')

module.exports = function CreateGroupApplication (server) {
  return function createGroupApplication (groupId, recps, { text }, cb) {
    if (!isGroupId(groupId)) return cb(new Error('expects a valid groupId'))
    const applicationMessage = {
      type: 'group/application',
      version: 'v1',
      groupId,
      recps: [...recps, server.id],
      text: {
        append: text
      },
      tangles: {
        application: { root: null, previous: null }
      }
    }
    if (!applicationSpec.isValid(applicationMessage)) {
      return cb(applicationSpec.isValid.errors)
    }
    server.publish(applicationMessage, (appErr, appData) => {
      if (appErr) return cb(appErr)
      server.tribes.application.get(appData.key, (_, finalData) => {
        cb(_, finalData)
      })
    })
  }
}
