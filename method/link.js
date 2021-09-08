const Crut = require('ssb-crut')
const { isFeed, isCloakedMsg: isGroup } = require('ssb-ref')
const pull = require('pull-stream')
const FeedGroupLink = require('../spec/link/feed-group')
const GroupSubgroupLink = require('../spec/link/group-subgroup')

module.exports = function Link (ssb) {
  const feedGroupLink = new Crut(ssb, FeedGroupLink)
  const groupSubgroupLink = new Crut(ssb, GroupSubgroupLink)

  function findLinks (type, opts = {}, cb) {
    const { parent, child } = opts
    if (parent && !isGroup(parent)) return cb(new Error(`findLinks expected a groupId for parent, got ${parent} instead.`))
    if (child && !isGroup(child)) return cb(new Error(`findLinks expected a groupId for child, got ${child} instead.`))
    if (!parent && !child) return cb(new Error('findLinks expects a parent or child id to be given'))

    const query = [{
      $filter: {
        value: {
          content: {
            type: `link/${type}`,
            ...opts,
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
      pull.unique(link => {
        if (parent) return link.value.content.child
        else return link.value.content.parent
      }),
      pull.filter(groupSubgroupLink.spec.isRoot),
      pull.map(link => {
        const { parent, child, recps } = link.value.content

        return {
          linkId: link.key,
          groupId: parent,
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
  }

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
    findSubGroupLinks (groupId, cb) {
      findLinks('group-subgroup', { parent: groupId }, cb)
    },
    findParentGroupLinks (groupId, cb) {
      findLinks('group-subgroup', { child: groupId }, cb)
    }
  }
}
