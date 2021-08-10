const { isCloakedMsgId: isGroupId } = require('ssb-ref')
const { isRoot: isValidFeedGroupLink } = require('../../spec/link/feed-group')
const { isRoot: isValidGroupSubgroupLink } = require('../../spec/link/group-group')

function CreateFeedGroupLink (server) {
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

    if (!isValidFeedGroupLink(content)) return cb(isValidFeedGroupLink.errors)

    server.publish(content, cb)
    // NOTE we *could* check the group is for a group we know about
    // but if it's not, encryption based on recps will fail
  }
}

function CreateGroupSubgroupLink (server) {
  return function createGroupSubgroupLink ({ group, subgroup }, cb) {
    if (!isGroupId(group)) return cb(new Error('link.create expects a valid groupId for the group'))
    if (!isGroupId(subgroup)) return cb(new Error('link.create expects a valid groupId for the subgroup'))

    const content = {
      type: 'link/group-subgroup',
      parent: group,
      child: subgroup,
      tangles: {
        link: { root: null, previous: null }
      },
      recps: [group]
    }

    if (!isValidGroupSubgroupLink(content)) return cb(isValidGroupSubgroupLink.errors)

    server.publish(content, cb)
  }
}

module.exports = {
  CreateFeedGroupLink,
  CreateGroupSubgroupLink
}
