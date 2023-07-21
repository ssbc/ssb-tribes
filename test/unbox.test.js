/* eslint-disable camelcase */

const test = require('tape')
const pull = require('pull-stream')
const { promisify: p } = require('util')

const envelope = require('../envelope')
const { decodeLeaves, Server } = require('./helpers')

const vectors = [
  require('./vectors/unbox1.json'),
  require('./vectors/unbox2.json')
].map(decodeLeaves)

test('unbox', async t => {
  const ssb = Server()
  const { groupId, groupInitMsg } = await p(ssb.tribes.create)({})
  const { poBoxId } = await p(ssb.tribes.poBox.create)({})

  async function testRecps (recps) {
    const content = {
      type: 'dummy',
      groupRef: groupInitMsg.key, // some randoms thing to hit with backlinks
      recps: Array.isArray(recps) ? recps : [recps]
    }
    const msg = await p(ssb.publish)(content)
      .catch(_ => {
        t.fail(`failed to publish with recps: ${content.recps}`)
      })
    if (!msg) return

    t.true(msg.value.content.endsWith('.box2'), `${content.recps} boxed`)

    const value = await p(ssb.get)({ id: msg.key, private: true })
    t.deepEqual(value.content, content, `${content.recps} unboxed`)
  }

  const RECPS = [
    ssb.id,
    groupId,
    poBoxId
  ]

  for (const recps of RECPS) {
    await testRecps(recps)
  }

  async function getBacklinks (dest) {
    const query = [{
      $filter: { dest }
    }]
    return new Promise((resolve, reject) => {
      pull(
        ssb.backlinks.read({ query }),
        pull.collect((err, msgs) => {
          if (err) reject(err)
          else resolve(msgs)
        })
      )
    })
  }

  const backlinks = await getBacklinks(groupInitMsg.key)
    .catch(err => {
      console.log(err)
      return []
    })
  t.equal(backlinks.length, 4, 'backlinks indexed all messages (unboxed!)')
  // console.log(backlinks.map(m => m.value.content))

  /* Vectors */
  console.log('test vectors:', vectors.length)
  vectors.forEach(vector => {
    const { msgs, trial_keys } = vector.input

    const mockKeyStore = {
      author: {
        groupKeys: () => trial_keys,
        sharedDMKey: () => ({ key: Buffer.alloc(32), scheme: 'junk' }) // just here to stop code choking
      }
    }
    const mockState = {
      keys: ssb.keys
    }
    const { unboxer } = envelope(mockKeyStore, mockState)
    const ciphertext = msgs[0].value.content

    const read_key = unboxer.key(ciphertext, msgs[0].value)
    const body = unboxer.value(ciphertext, msgs[0].value, read_key)
    t.deepEqual(body, vector.output.msgsContent[0], vector.description)
  })

  ssb.close()
  t.end()
})
