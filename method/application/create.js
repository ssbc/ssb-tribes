const { isCloakedMsgId: isGroupId } = require('ssb-ref')
const applicationSpec = require('../../spec/application/application')

module.exports = function CreateGroupApplication (server) {
  return function createGroupApplication (groupId, authorIds, text, cb) {
    if (!isGroupId(groupId)) return cb(new Error('expects a valid groupId'))

    // server.tribes.create({}, (groupErr, groupData) => {
    //   if (groupErr) cb(groupErr)
    //   const recps = [groupData.groupId, ...authorIds]
    //   console.log('createGroupApplication -> recps', recps)
    const applicationMessage = {
      type: 'group/application',
      version: 'v1',
      groupId,
      recps: authorIds,
      text: {
        append: text
      },
      tangles: {
        application: { root: null, previous: null }
      }
    }
    if (!applicationSpec.isValid(applicationMessage)) { return cb(applicationSpec.isValid.errors) }
    server.publish(applicationMessage, (_, appData) => {
      console.log('createGroupApplication -> appData.key', appData.key)
      server.get({ id: appData.key, private: true }, (_, finalData) => {
        cb(_, Object.assign({ key: appData.key }, finalData))
      })
    })
    // })
  }
}
