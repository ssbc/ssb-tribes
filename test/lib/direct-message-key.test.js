const test = require('tape')
const { generate } = require('ssb-keys')
const vectors = [
  require('private-group-spec/vectors/direct-message-key1.json')
]

const { decodeLeaves, DHFeedKeys } = require('../helpers')
const directMessageKey = require('../../lib/direct-message-key')

test('direct-message-key', t => {
  const mySSBKeys = generate()
  const my = DHFeedKeys(mySSBKeys)

  const yourSSBKeys = generate()
  const your = DHFeedKeys(yourSSBKeys)
  // directMessageKey (my_dh_secret, my_dh_public, your_dh_public, my_feed_tfk, your_feed_tfk) {

  /* general checks */
  t.deepEqual(
    directMessageKey(my.dh.secret, my.dh.public, my.feed.tfk, your.dh.public, your.feed.tfk),
    directMessageKey(your.dh.secret, your.dh.public, your.feed.tfk, my.dh.public, my.feed.tfk),
    'the key is shared!'
  )

  t.isNotDeepEqual(
    directMessageKey(my.dh.secret, my.dh.public, my.feed.tfk, your.dh.public, your.feed.tfk),
    Buffer.alloc(32),
    'is not empty'
  )

  t.deepEqual(
    directMessageKey.easy(mySSBKeys)(yourSSBKeys.id),
    directMessageKey(my.dh.secret, my.dh.public, my.feed.tfk, your.dh.public, your.feed.tfk),
    'DirectMessageKey.easy produces same result'
  )

  /* test vectors we've imported */
  vectors.forEach(vector => {
    decodeLeaves(vector)

    const { my_dh_secret, my_dh_public, my_feed_tfk, your_dh_public, your_feed_tfk } = vector.input

    const sharedKey = directMessageKey(
      my_dh_secret, my_dh_public, my_feed_tfk,
      your_dh_public, your_feed_tfk
    )

    t.deepEqual(
      sharedKey,
      vector.output.shared_key,
      vector.description
    )
  })

  t.end()
})
