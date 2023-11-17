const test = require('tape')
const { promisify: p } = require('util')
const childProcess = require('node:child_process')

const OldTestBot = require('scuttle-testbot-1-11-0')
const NewBot = require('./helpers/test-bot')
const { join } = require('path')

const OldBot = (opts) => {
  let stack = OldTestBot // eslint-disable-line
    .use(require('ssb-backlinks-2-1-1'))
    .use(require('ssb-query-2-4-5'))
    .use(require('ssb-tribes-3-1-3'))

  return stack(opts)
}

test('can continue from old keyring from ssb-tribes 3.1.3', async t => {
  const oldAlice = OldBot({ name: 'alice' })

  const oldGroup = await p(oldAlice.tribes.create)({})

  t.equal(typeof oldGroup.groupId, 'string', 'got a group id when creating using old bot')

  const oldList = await p(oldAlice.tribes.list)()
  t.deepEqual(oldList, [oldGroup.groupId], 'group got listed by old bot')

  const oldGet = await p(oldAlice.tribes.get)(oldGroup.groupId)

  t.equal(oldGet.groupId, oldGroup.groupId, 'got correct groupId')
  t.equal(oldGet.key, oldGroup.groupKey, 'got correct key')
  t.equal(typeof oldGet.scheme, 'string', 'got scheme')
  t.equal(typeof oldGet.root, 'string', 'got root')

  await p(oldAlice.close)(true)

  await p(setTimeout)(500)

  // we have to do it this way because we have no normal way of killing a bot that's crashed and therefore releasing its DB locks.
  const throwChild = childProcess.fork(join(__dirname, 'helpers/throw-bot.js'))

  await new Promise((resolve) => {
    throwChild.on('message', (msg) => {
      t.match(msg, /found an old keystore/, "error when there's an old keystore but we don't use it")

      throwChild.kill()

      resolve()
    })
  })

  await p(setTimeout)(1000)

  const newOpts = {
    name: 'alice',
    startUnclean: true
  }

  const newAlice = NewBot({
    ...newOpts,
    box2: {
      path: 'tribes/keystore'
    }
  })

  const newList = await p(newAlice.tribes.list)()
  t.deepEqual(newList, oldList, 'new bot has same group list as old')

  const newGet = await p(newAlice.tribes.get)(oldGroup.groupId)

  t.deepEqual(newGet, {
    groupId: oldGet.groupId,
    writeKey: { key: oldGet.key, scheme: oldGet.scheme },
    readKeys: [{ key: oldGet.key, scheme: oldGet.scheme }],
    root: oldGet.root
  }, 'get with new bot matches get with old bot')

  await p(newAlice.close)()
})
