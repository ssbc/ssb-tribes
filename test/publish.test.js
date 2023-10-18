const test = require('tape')
const { promisify: p } = require('util')
// const pull = require('pull-stream')
const { Server, GroupId, replicate, FeedId } = require('./helpers')

test.skip('publish (to groupId)', t => {
  const server = Server()

  server.tribes.create(null, (err, data) => {
    t.error(err, 'group created')

    const { groupId } = data

    const content = {
      type: 'announce',
      text: 'summer has arrived in wellington!',
      recps: [groupId]
    }
    /* NOTE with this we confirm that content.recps isn't mutated while sneakin our own_key in! */
    // TODO: ssb-tribes/envelope.js has specific logic for if we're in a test or not, we're not using that anymore so this is failing. specifically the msg size. should we maybe just trust that ssb-box2 works correctly/tests this for us?
    process.env.NODE_ENV = 'production'
    console.log('NODE_ENV', process.env.NODE_ENV)
    Object.freeze(content.recps)

    server.tribes.publish(content, (err, msg) => {
      t.error(err, 'msg published to group')
      t.true(msg.value.content.endsWith('.box2'), 'publishes envelope cipherstring')
      const cipherTextSize = Buffer.from(msg.value.content.replace('.box2', ''), 'base64').length

      server.get({ id: msg.key, private: true, meta: true }, (err, msg) => {
        t.error(err)
        t.deepEqual(msg.value.content, content, 'can open envelope!')

        const plainTextSize = Buffer.from(JSON.stringify(msg.value.content)).length
        const expectedSize = 32 + (msg.value.content.recps.length + 1) * 32 + (plainTextSize + 16)
        // header + (recp key slots) + (content + HMAC)
        // NOTE - we sneak ourselves in as a key_slot when we can
        t.equal(cipherTextSize, expectedSize, 'cipherTextSize overhead correct') // 112 bytes

        /* return ENV to testing */
        process.env.NODE_ENV = 'test'
        console.log('NODE_ENV', process.env.NODE_ENV)
        server.close(t.end)
      })
    })
  })
})

test('publish (to groupId we dont have key for)', t => {
  const server = Server()
  const groupId = GroupId()

  const content = {
    type: 'announce',
    text: 'summer has arrived in wellington!',
    recps: [groupId]
  }

  server.tribes.publish(content, (err) => {
    t.match(err.message, /unknown groupId/, 'returns error')
    server.close(t.end)
  })
})

test('publish (group + feedId)', t => {
  const server = Server()

  server.tribes.create({}, (err, data) => {
    t.error(err)

    const { groupId } = data
    const feedId = FeedId()

    const content = {
      type: 'announce',
      text: 'summer has arrived in wellington!',
      recps: [groupId, feedId]
    }

    server.tribes.publish(content, (err, msg) => {
      t.error(err)

      t.true(msg.value.content.endsWith('.box2'), 'publishes envelope cipherstring')

      server.get({ id: msg.key, private: true, meta: true }, (err, msg) => {
        t.error(err)
        t.deepEqual(msg.value.content, content, 'can open envelope!')

        server.close(t.end)
      })
    })
  })
})

test.skip('publish (DMs: myFeedId + feedId)', async t => {
  const alice = Server()
  const bob = Server()
  const name = (id) => {
    if (id === alice.id) return 'alice'
    if (id === bob.id) return 'bob  '
  }

  const content = {
    type: 'announce',
    text: 'summer has arrived in wellington!',
    // TODO: failing here because the first recp isn't a groupId. the old code just published anyway. do we still want to do that? i think the spec might allow it but we disallow it in tribes2
    recps: [alice.id, bob.id]
  }

  try {
    const msg = await p(alice.tribes.publish)(content)
    await p(alice.tribes.publish)({ type: 'doop' })
    t.true(msg.value.content.endsWith('.box2'), 'publishes envelope cipherstring')

    const aliceGet = await p(alice.get)({ id: msg.key, private: true, meta: true })
    t.deepEqual(aliceGet.value.content, content, 'alice can open envelope!')

    await p(replicate)({ from: alice, to: bob, name, live: false })
    const bobGet = await p(bob.get)({ id: msg.key, private: true, meta: true })
    t.deepEqual(bobGet.value.content, content, 'bob can open envelope!')

    await p(alice.close)()
    await p(bob.close)()
  } catch (err) {
    t.fail(err)
  }
  t.end()
})

test('publish (bulk)', t => {
  const server = Server()

  server.tribes.create({}, (_, { groupId }) => {
    let count = 20
    const bulk = [...Array(count)]
      .map(() => ({ type: 'test', recps: [groupId] }))

    bulk.forEach((content, i) => {
      server.tribes.publish(content, (err, msg) => {
        if (err) t.error(err, `${i + 1} published`)
        if (typeof msg.value.content !== 'string') t.fail(`${i + 1} encrypted`)

        server.get({ id: msg.key, private: true }, (err, value) => {
          if (err) t.error(err, `${i + 1} get`)
          if (typeof value.content !== 'object') t.fail(`${i + 1} decryptable`)
          if (--count === 0) {
            t.pass('success!')
            server.close(t.end)
          }
        })
      })
    })

    /* works fine */
    // pull(
    //   pull.values(bulk),
    //   pull.asyncMap(server.tribes.publish),
    //   pull.drain(
    //     () => process.stdout.write('✓'),
    //     (err) => {
    //       process.stdout.write('\n')
    //       t.error(err)
    //       server.close(t.end)
    //     }
    //   )
    // )

    // TODO ideally need to confirm that all messages are readable too,
    // because encryption !== encrypting right! (e.g. if previous was wrong)
  })
})
