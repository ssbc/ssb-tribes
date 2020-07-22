const { isCloakedMsgId: isGroupId } = require('ssb-ref')
const applicationSpec = require('../../spec/application/application')
const applyToJoinSpec = require('../../spec/application/applyToJoin')

module.exports = function CreateGroupApplication (server, keystore) {
  return function createGroupApplication (groupId, authorId, text, cb) {
    // const { key, root } = keystore.group.get(groupId)
    // console.log('root', root, key)
    if (!isGroupId(groupId)) return cb(new Error('expects a valid groupId'))
    const applyToJoinMessage = {
      type: 'group/apply-to-join',
      version: 'v1',
      groupId,
      // root,
      text,
      recps: [groupId, authorId],
      tangles: {
        application: { root: null, previous: null }
      }
    }
    if (!applyToJoinSpec.isValid(applyToJoinMessage)) { return cb(applyToJoinSpec.isValid.errors) }

    server.publish(applyToJoinMessage, (_, data) => {
      const applicationMessage = {
        type: 'group/application',
        version: 'v1',
        root: data.key,
        recps: [groupId, authorId],
        tangles: {
          application: { root: data.key, previous: [data.key] }
        }
      }
      if (!applicationSpec.isValid(applicationMessage)) { return cb(applicationSpec.isValid.errors) }
      server.publish(applicationMessage, (_, appData) => {
        server.get({ id: appData.key, private: true }, cb)
      })
    })
  }
}
