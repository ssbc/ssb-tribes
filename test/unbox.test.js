/* eslint-disable camelcase */

const test = require('tape')
const pull = require('pull-stream')
const { promisify: p } = require('util')
const { decodeLeaves, Server, Run } = require('./helpers')

const envelope = require('../envelope')

const vectors = [
  require('./vectors/unbox1.json'),
  require('./vectors/unbox2.json')
].map(decodeLeaves)

test.skip('unbox', async t => {
  const run = Run(t)
  const ssb = Server()
  const { groupId, groupInitMsg } = await p(ssb.tribes.create)({})
  const { poBoxId } = await p(ssb.tribes.poBox.create)({})

  async function testRecps (recps) {
    recps = Array.isArray(recps) ? recps : [recps]
    const content = {
      type: 'dummy',
      groupRef: groupInitMsg.key, // some randoms thing to hit with backlinks
      recps
    }
    const msg = await run(
      `publish with recps: ${recps}`,
      p(ssb.tribes.publish)(content)
    )
    t.true(msg.value.content.endsWith('.box2'), 'box')

    const value = await p(ssb.get)({ id: msg.key, private: true })
    t.deepEqual(value.content, content, 'unbox')
  }

  const RECPS = [
    // TODO: i think i asked this somewhere else, but do we actually wanna support DMs in the first slot in this module? what's the usecase?
    ssb.id,
    groupId,
    // TODO: p.s. do we have some test that tests DMing a pobox actually? that's a non-groupId that should be allowed in the first slot, i guess
    poBoxId
  ]

  for (const recps of RECPS) {
    await testRecps(recps)
  }

  const backlinks = await run(
    'get backlinks',
    pull(
      ssb.query.read({
        query: [{
          $filter: {
            value: {
              content: {
                type: 'dummy',
                groupRef: groupInitMsg.key
              }
            }
          }
        }]
      }),
      pull.map(m => m.value.content.recps[0]),
      // just pull the recps on each one
      pull.collectAsPromise()
    )
  )
  t.deepEqual(backlinks, RECPS, 'backlinks indexed all messages (unboxed!)')

  await run('close ssb', p(ssb.close)(true))
  t.end()
})

// TODO: this tests envelope() which we're probably gonna remove in favor of box2, so we should remove this test too right?
test.skip('unbox - test vectors', async t => {
  console.log('vectors:', vectors.length)

  vectors.forEach(vector => {
    const { msgs, trial_keys } = vector.input

    const mockKeyStore = {
      group: {
        listSync: () => ['a'],
        get: () => ({
          readKeys: trial_keys
        })
      },
      dm: {
        has: () => true,
        get: () =>
          ({ key: Buffer.alloc(32), scheme: 'junk' }) // just here to stop code choking
      }
    }

    const mockState = {
      keys: {
        curve: 'ed25519',
        public: '3Wr/Swdt8vTC4NdOWJKaIX2hU2qcarSSdFpV4eyJKVw=.ed25519',
        private: 'rlg3ciKZRCcYLjbDfy4eymsvNzCHRXDfWw65PvttqiXdav9LB23y9MLg105YkpohfaFTapxqtJJ0WlXh7IkpXA==.ed25519',
        id: '@3Wr/Swdt8vTC4NdOWJKaIX2hU2qcarSSdFpV4eyJKVw=.ed25519'
      }
    }

    const { unboxer } = envelope(mockKeyStore, mockState)
    const ciphertext = msgs[0].value.content

    const read_key = unboxer.key(ciphertext, msgs[0].value)
    const body = unboxer.value(ciphertext, msgs[0].value, read_key)
    t.deepEqual(body, vector.output.msgsContent[0], vector.description)
  })

  console.log('DONE')

  t.end()
})
