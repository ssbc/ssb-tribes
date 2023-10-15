const Crut = require('ssb-crut')
const { isFeed, isCloakedMsg: isGroup } = require('ssb-ref')
const pull = require('pull-stream')
const { where, and, type: dbType, author, slowEqual, toPullStream } = require('ssb-db2/operators')
const FeedGroupLink = require('../spec/link/feed-group')
const GroupSubGroupLink = require('../spec/link/group-subgroup')

module.exports = function Link (ssb) {
  const feedGroupLink = new Crut(
    ssb,
    FeedGroupLink,
    {
      publish: (...args) => ssb.tribes.publish(...args),
      feedId: ssb.id
    }
  )
  const groupSubGroupLink = new Crut(ssb, GroupSubGroupLink)

  // NOTE this is not generalised to all links, it's about group links
  function findLinks (type, opts = {}, cb) {
    const { parent, child } = opts
    if (parent && !isGroup(parent)) return cb(new Error(`findLinks expected a groupId for parent, got ${parent} instead.`))
    if (child && !isGroup(child)) return cb(new Error(`findLinks expected a groupId for child, got ${child} instead.`))
    if (!parent && !child) return cb(new Error('findLinks expects a parent or child id to be given'))

    pull(
      ssb.db.query(
        where(
          and(
            dbType(type),
            parent && slowEqual('value.content.parent', parent),
            child && slowEqual('value.content.child', child),
            slowEqual('value.content.tangles.link.root', null),
            slowEqual('value.content.tangles.link.previous', null),
          )
        ),
        toPullStream()
      ),
      pull.unique(link => {
        if (parent) return link.value.content.child
        else return link.value.content.parent
      }),
      pull.filter(groupSubGroupLink.spec.isRoot),
      pull.map(link => {
        const { parent, child, recps, admin } = link.value.content

        return {
          linkId: link.key,
          groupId: parent,
          subGroupId: child,
          admin: (admin && admin.set) || null,
          recps
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

      feedGroupLink.create(input, (err, linkId) => {
        if (err) return cb(err)

        feedGroupLink.read(linkId, cb)
      })
    },
    createSubGroupLink ({ group, subGroup, admin }, cb) {
      const input = {
        parent: group,
        child: subGroup,
        recps: [group]
      }

      if (admin) input.admin = true

      groupSubGroupLink.create(input, (err, linkId) => {
        if (err) return cb(err)

        groupSubGroupLink.read(linkId, cb)
      })
    },
    findGroupByFeedId (feedId, cb) {
      if (!isFeed(feedId)) return cb(new Error('requires a valid feedId'))

      pull(
        ssb.db.query(
          where(
            and(
              author(feedId),
              dbType('link/feed-group'),
              slowEqual('value.content.parent', feedId),
              slowEqual('value.content.tangles.link.root', null),
              slowEqual('value.content.tangles.link.previous', null),
            )
          ),
          toPullStream()
        ),
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
      findLinks('link/group-group/subgroup', { parent: groupId }, cb)
    },
    findParentGroupLinks (groupId, cb) {
      findLinks('link/group-group/subgroup', { child: groupId }, cb)
    }
  }
}
