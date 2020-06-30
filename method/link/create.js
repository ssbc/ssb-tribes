const { isCloakedMsgId: isGroupId } = require('ssb-ref')
const { isValid } = require('../../spec/link/feed-group')

module.exports = function CreateFeedGroupLink (server) {
  return function createFeedGroupLink ({ group, name }, cb) {
    if (!isGroupId(group)) return cb(new Error('expects a valid groupId'))

    const content = {
      type: 'link/feed-group',
      parent: server.id,
      child: group,
      name: { set: name },
      // tangles currently unused
      tangles: {
        link: { root: null, previous: null }
      },
      recps: [group]
    }

    if (!name) delete content.name

    if (!isValid(content)) return cb(isValid.errors)

    server.publish(content, cb)
    // NOTE we *could* check the group is for a group we know about
    // but if it's not, encryption based on recps will fail
  }
}
