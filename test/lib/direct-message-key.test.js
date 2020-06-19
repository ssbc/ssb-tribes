const test = require('tape')
const { generate } = require('ssb-keys')
const vectors = [
  require('private-group-spec/vectors/direct-message-key1.json')
]

const { decodeLeaves, DHFeedKeys } = require('../helpers')
const directMessageKey = require('../../lib/direct-message-key')

test('direct-message-key', t => {
  /* local tests */
  const mySSBKeys = generate()
  const my = DHFeedKeys(mySSBKeys)

  const yourSSBKeys = generate()
  const your = DHFeedKeys(yourSSBKeys)
  // directMessageKey (my_dh_secret, my_dh_public, your_dh_public, my_feed_id, your_feed_id) {

  /* general checks */
  t.deepEqual(
    directMessageKey(my.dh.secret, my.dh.public, my.feedId, your.dh.public, your.feedId),
    directMessageKey(your.dh.secret, your.dh.public, your.feedId, my.dh.public, my.feedId),
    'the key is shared!'
  )

  t.isNotDeepEqual(
    directMessageKey(my.dh.secret, my.dh.public, my.feedId, your.dh.public, your.feedId),
    Buffer.alloc(32),
    'is not empty'
  )

  t.deepEqual(
    directMessageKey.easy(mySSBKeys)(yourSSBKeys.id),
    directMessageKey(my.dh.secret, my.dh.public, my.feedId, your.dh.public, your.feedId),
    'DirectMessageKey.easy produces same result'
  )

  console.log('testing vectors')
  /* test vectors we've imported */

  // WIP - export new test vectors, link + get this passing
  vectors.forEach(vector => {
    decodeLeaves(vector)

    const { my_dh_secret, my_dh_public, my_feed_id, your_dh_public, your_feed_id } = vector.input

    const sharedKey = directMessageKey(
      my_dh_secret, my_dh_public, my_feed_id,
      your_dh_public, your_feed_id
    )

    t.deepEqual(
      sharedKey,
      vector.output.shared_key,
      vector.description
    )
  })

  t.end()
})
