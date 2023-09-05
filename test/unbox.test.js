/* eslint-disable camelcase */

const test = require('tape')
const pull = require('pull-stream')
const { promisify: p } = require('util')

const envelope = require('../envelope')
const { decodeLeaves, Server, Run } = require('./helpers')

const vectors = [
  require('private-group-spec/vectors/unbox1.json'),
  require('private-group-spec/vectors/unbox2.json')
].map(decodeLeaves)

test('unbox', async t => {
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
      p(ssb.publish)(content)
    )
    t.true(msg.value.content.endsWith('.box2'), 'box')

    const value = await p(ssb.get)({ id: msg.key, private: true })
    t.deepEqual(value.content, content, 'unbox')
  }

  const RECPS = [
    ssb.id,
    groupId,
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

test('unbox - test vectors', async t => {
  console.log('vectors:', vectors.length)

  vectors.forEach(vector => {
    const { msgs, trial_keys } = vector.input

    const mockKeyStore = {
      author: {
        groupKeys: () => trial_keys,
        sharedDMKey: () => ({ key: Buffer.alloc(32), scheme: 'junk' }) // just here to stop code choking
      },
      group: {
        list: () => ['a'],
        get: () => trial_keys
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
