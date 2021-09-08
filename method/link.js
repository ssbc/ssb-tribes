const Crut = require('ssb-crut')
const { isFeed, isCloakedMsg: isGroup } = require('ssb-ref')
const pull = require('pull-stream')
const FeedGroupLink = require('../spec/link/feed-group')
const GroupSubgroupLink = require('../spec/link/group-subgroup')

module.exports = function Link (ssb) {
  const feedGroupLink = new Crut(ssb, FeedGroupLink)
  const groupSubgroupLink = new Crut(ssb, GroupSubgroupLink)

  return {
    create ({ group, name }, cb) {
      const input = {
        parent: ssb.id,
        child: group,
        name,
        recps: [group]
      }

      if (!name) delete input.name

      feedGroupLink.create.bind(feedGroupLink)(input, (err, linkId) => {
        if (err) return cb(err)

        feedGroupLink.read(linkId, cb)
      })
    },
    createSubgroupLink ({ group, subgroup }, cb) {
      const input = {
        parent: group,
        child: subgroup,
        recps: [group]
      }

      groupSubgroupLink.create.bind(groupSubgroupLink)(input, (err, linkId) => {
        if (err) return cb(err)

        groupSubgroupLink.read(linkId, cb)
      })
    },
    findGroupByFeedId (feedId, cb) {
      if (!isFeed(feedId)) return cb(new Error('requires a valid feedId'))

      const query = [{
        $filter: {
          value: {
            author: feedId, // link published by this person
            content: {
              type: 'link/feed-group',
              parent: feedId, // and linking from that feedId
              tangles: {
                link: { root: null, previous: null }
              }
            }
          }
        }
      }]

      pull(
        // NOTE: using ssb-query instead of ssb-backlinks
        // because the backlinks query will get EVERY message which contains the groupId in it, which will be a LOT for a group
        // then filters that massive amount down to the ones which have the dest in the right place
        ssb.query.read({ query }),
        pull.filter(feedGroupLink.spec.isRoot),
        pull.filter(link => {
          return link.value.content.child === link.value.content.recps[0]
          // it would be very strange for a link to be created like this
          // but we should consider it unsafe and ignore it I think
        }),
        pull.map(link => {
          const { child, name, recps } = link.value.content

          // NOTE this is a form that we might need to support if we
          // have mutable link state in the future.
          // (e.g. name, tombstone, ...tombstone)

          return {
            groupId: child,
            recps,
            states: [{
              head: link.key,
              state: {
                name: (name && name.set) || null
              }
            }]
          }
        }),
        pull.collect(cb)
      )
    },
    findSubgroupByGroupId (groupId, cb) {
      if (!isGroup(groupId)) return cb(new Error(`findSubgroupByGroupId expected a groupId, got ${groupId} instead.`))

      const query = [{
        $filter: {
          value: {
            content: {
              type: 'link/group-subgroup',
              parent: groupId,
              tangles: {
                link: { root: null, previous: null }
              }
            }
          }
        }
      }]

      pull(
        // NOTE: using ssb-query instead of ssb-backlinks
        // because the backlinks query will get EVERY message which contains the groupId in it, which will be a LOT for a group
        // then filters that massive amount down to the ones which have the dest in the right place
        ssb.query.read({ query }),
        pull.unique(link => link.value.content.child),
        pull.filter(groupSubgroupLink.spec.isRoot),
        pull.filter(link => {
          return link.value.content.parent === link.value.content.recps[0]
          // it would be very strange for a link to be created like this
          // but we should consider it unsafe and ignore it I think
        }),
        pull.map(link => {
          const { child, recps } = link.value.content

          return {
            linkId: link.key,
            groupId,
            subgroupId: child,
            recps,
            states: [{
              head: link.key,
              state: {
              }
            }]
          }
        }),
        pull.collect(cb)
      )
    },
    findGroupBySubgroupId (groupId, cb) {
      if (!isGroup(groupId)) return cb(new Error(`findSubgroupByGroupId expected a groupId, got ${groupId} instead.`))

      const query = [{
        $filter: {
          value: {
            content: {
              type: 'link/group-subgroup',
              child: groupId,
              tangles: {
                link: { root: null, previous: null }
              }
            }
          }
        }
      }]

      pull(
        // NOTE: using ssb-query instead of ssb-backlinks
        // because the backlinks query will get EVERY message which contains the groupId in it, which will be a LOT for a group
        // then filters that massive amount down to the ones which have the dest in the right place
        ssb.query.read({ query }),
        pull.unique(link => link.value.content.parent),
        pull.filter(groupSubgroupLink.spec.isRoot),
        pull.filter(link => {
          return link.value.content.parent === link.value.content.recps[0]
          // it would be very strange for a link to be created like this
          // but we should consider it unsafe and ignore it I think
        }),
        pull.map(link => {
          const { parent, recps } = link.value.content

          return {
            linkId: link.key,
            groupId,
            parentGroupId: parent,
            recps,
            states: [{
              head: link.key,
              state: {
              }
            }]
          }
        }),
        pull.collect(cb)
      )
    }
  }
}
