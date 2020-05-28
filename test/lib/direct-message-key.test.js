const test = require('tape')
const { generate } = require('ssb-keys')
const vectors = [
  require('private-group-spec/vectors/direct-message-key1.json')
]

const { decodeLeaves } = require('../helpers')
const directMessageKey = require('../../lib/direct-message-key')

test('direct-message-key', t => {
  const myKeys = makeKeys()
  const yourKeys = makeKeys()

  t.deepEqual(
    directMessageKey(myKeys.secret)(yourKeys.public),
    directMessageKey(yourKeys.secret)(myKeys.public),
    'the key is shared!'
  )

  t.isNotDeepEqual(
    directMessageKey(myKeys.secret)(yourKeys.public),
    Buffer.alloc(32),
    'is not empty'
  )

  vectors.forEach(vector => {
    decodeLeaves(vector)

    const mySk = Buffer.from(
      vector.input.my_keys.private.replace('.ed25519', ''),
      'base64'
    )

    const yourPk = Buffer.from(
      vector.input.feed_id
        .replace('@', '')
        .replace('.ed25519', ''),
      'base64'
    )

    t.deepEqual(
      directMessageKey(mySk)(yourPk),
      vector.output.shared_key,
      vector.description
    )
  })

  t.end()
})

function makeKeys () {
  const keys = generate()

  return {
    public: Buffer.from(keys.public.replace('.ed25519', ''), 'base64'),
    secret: Buffer.from(keys.private.replace('.ed25519', ''), 'base64')
  }
}
