const { promisify: p } = require('util')
const test = require('tape')
const { keySchemes } = require('private-group-spec')
const { Server } = require('../../helpers')

test('can set and get own self dm key', async (t) => {
  const alice = Server()

  const ownKey = Buffer.from(
    '30720d8f9cbf37f6d7062826f6decac93e308060a8aaaa77e6a4747f40ee1a76',
    'hex'
  )

  alice.tribes.ownKeys.register(ownKey)

  const gottenKeyList = await p(alice.tribes.ownKeys.list)()
  const gottenKey = gottenKeyList[0]

  t.equal(gottenKey.key, ownKey, 'got correct key')
  t.equal(gottenKey.scheme, keySchemes.feed_id_self, 'got correct scheme')

  await p(alice.close)()
})
