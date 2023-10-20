/* eslint-disable camelcase */

const test = require('tape')
const pull = require('pull-stream')
const { promisify: p } = require('util')
const { Server, Run } = require('./helpers')

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
