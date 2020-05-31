const test = require('tape')
const ssbKeys = require('ssb-keys')
const FeedKeys = require('../../lib/feed-keys')

test('FeedKeys', t => {
  const keys = ssbKeys.generate()

  const pkBuff = Buffer.from(keys.public.replace('.ed25519', ''), 'base64')
  const skBuff = Buffer.from(keys.private.replace('.ed25519', ''), 'base64')

  t.deepEqual(
    new FeedKeys(keys).toBuffer(),
    { public: pkBuff, private: skBuff, secret: skBuff }
  )

  t.end()
})
