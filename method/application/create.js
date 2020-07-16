const { isCloakedMsgId: isGroupId } = require('ssb-ref')
const applicationSpec = require('../../spec/application/application')
const applyToJoinSpec = require('../../spec/application/applyToJoin')

module.exports = function CreateGroupApplication (server) {
  return function createGroupApplication (groupId, text, cb) {
    if (!isGroupId(groupId)) return cb(new Error('expects a valid groupId'))
    const authorIds = []
    const applyToJoinMessage = {
      type: 'group/apply-to-join',
      version: 'v1',
      groupId,
      text,
      recps: authorIds,
      tangles: {
        application: { root: null, previous: null }
      }
    }
    if (!applyToJoinSpec.isValid(applyToJoinMessage))
      return cb(applyToJoinSpec.isValid.errors)

    server.publish(applyToJoinMessage, (err, data) => {
      console.log('DATA', data)
      const applicationMessage = {
        type: 'group/application',
        version: '1',
        addMember: { add: MessageId },
        recps: authorIds,
        tangles: {
          application: { root: data.id, previous: [data.id] }
        }
      }
      if (!applicationSpec.isValid(applicationMessage))
        return cb(applicationSpec.isValid.errors)
      server.publish(applicationMessage, cb)
    })

    // NOTE we *could* check the group is for a group we know about
    // but if it's not, encryption based on recps will fail
  }
}
