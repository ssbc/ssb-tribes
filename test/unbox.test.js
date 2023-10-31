/* eslint-disable camelcase */

const test = require('tape')
const pull = require('pull-stream')
const { promisify: p } = require('util')
const { where, and, type, slowEqual, toPullStream } = require('ssb-db2/operators')
const { Server, Run } = require('./helpers')

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
      p(ssb.tribes.publish)(content)
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
      ssb.db.query(
        where(
          and(
            type('dummy'),
            slowEqual('value.content.groupRef', groupInitMsg.key)
          )
        ),
        toPullStream()
      ),
      pull.map(m => m.value.content.recps[0]),
      // just pull the recps on each one
      pull.collectAsPromise()
    )
  )
  t.deepEqual(backlinks, RECPS, 'backlinks indexed all messages (unboxed!)')

  await run('close ssb', p(ssb.close)(true))
  t.end()
})
