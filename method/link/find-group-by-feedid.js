const { isFeed } = require('ssb-ref')
const pull = require('pull-stream')

const { isValid } = require('../../spec/link/feed-group')

module.exports = function FindByFeedId (server) {
  return function findByFeedId (feedId, cb) {
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
      server.query.read({ query }),
      pull.filter(isValid),
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
  }
}
