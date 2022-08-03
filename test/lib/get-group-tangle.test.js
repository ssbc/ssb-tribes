const test = require('tape')
const { Server, replicate } = require('../helpers')
const pull = require('pull-stream')
const paraMap = require('pull-paramap')
const { GetGroupTangle } = require('../../lib')

test('get-group-tangle unit test', t => {
  const name = `get-group-tangle-${Date.now()}`
  const server = Server({ name })

  //    - creating a group and publishing messages (ssb-tribes)
  server.tribes.create(null, (err, data) => {
    if (err) throw err
    const keystore = {
      group: {
        get (groupId) {
          return { ...data, root: data.groupInitMsg.key } // rootMsgId
        }
      }
    }
    // NOTE: Tribes create callback with different data than keystore.group.get :(
    // Somebody should probably fix that

    // NOTE: Publishing has a queue which means if you publish many things in a row there is a delay before those values are in indexes to be queried.
    const _getGroupTangle = GetGroupTangle(server, keystore)
    const getGroupTangle = (id, cb) => {
      setTimeout(() => _getGroupTangle(id, cb), 300)
    }

    getGroupTangle(data.groupId, (err, { root, previous }) => {
      if (err) throw err
      const rootKey = data.groupInitMsg.key

      pull(
        server.createUserStream({ id: server.id, reverse: true }),
        pull.map(m => m.key),
        pull.take(1),
        pull.collect((err, keys) => {
          if (err) throw err

          t.deepEqual(
            { root, previous },
            { root: rootKey, previous: [keys[0]] },
            'group add-member of admin should be the tip'
          )

          //  publishing to the group:
          const content = {
            type: 'memo',
            root: data.groupId,
            message: 'unneccessary',
            recps: [data.groupId]
          }

          server.publish(content, (err, msg) => {
            if (err) throw err

            getGroupTangle(data.groupId, (err, { root, previous }) => {
              if (err) throw err
              t.deepEqual({ root, previous }, { root: data.groupInitMsg.key, previous: [msg.key] }, 'adding message to root')

              server.publish(content, (err, msg) => {
                if (err) throw err
                getGroupTangle(data.groupId, (err, { root, previous }) => {
                  if (err) throw err
                  t.deepEqual({ root, previous }, { root: data.groupInitMsg.key, previous: [msg.key] }, 'adding message to tip')
                  server.close()
                  t.end()
                })
              })
            })
          })
        })
      )
    })
  })
})

test('get-group-tangle (cache)', t => {
  const name = `get-group-tangle-cache-${Date.now()}`
  const server = Server({ name })

  let queryCalls = 0
  server.backlinks.read.hook(function (read, args) {
    queryCalls += 1

    return read(...args)
  })
  server.tribes.create(null, (err, data) => {
    if (err) throw err

    t.equal(queryCalls, 1, 'no cache for publishing of group/add-member, a backlink query was run')
    const content = { type: 'memo', recps: [data.groupId] }

    server.publish(content, (err, msg) => {
      if (err) throw err

      t.equal(queryCalls, 1, 'cache used for publishing next message')

      server.close()
      t.end()
    })
  })
})

const n = 100
test(`get-group-tangle-${n}-publishes`, t => {
  const publishArray = new Array(n).fill().map((item, i) => i)
  const server = Server()
  let count = 0
  server.tribes.create(null, (err, data) => {
    if (err) throw err

    const groupId = data.groupId
    pull(
      pull.values(publishArray),
      paraMap(
        (value, cb) => server.publish({ type: 'memo', value, recps: [groupId] }, cb),
        4
      ),
      paraMap(
        (msg, cb) => server.get({ id: msg.key, private: true, meta: true }, cb),
        10
      ),
      pull.drain(
        (m) => {
          count += (m.value.content.tangles.group.previous.length)
        },
        () => {
          // t.equal(count, n, 'We expect there to be no branches in our groupTangle')
          t.true(count < n * 8, 'We expect bounded branching with fast publishing')

          server.close()
          t.end()
        }
      )
    )
  })
})

test('get-group-tangle', t => {
  const tests = [
    {
      plan: 4,
      test: (t) => {
        const DESCRIPTION = 'auto adds group tangle'
        // this is an integration test, as we've hooked get-group-tangle into ssb.publish
        const ssb = Server()

        ssb.tribes.create(null, (err, data) => {
          t.error(err, 'create group')

          const groupRoot = data.groupInitMsg.key
          const groupId = data.groupId

          const content = {
            type: 'yep',
            recps: [groupId]
          }

          ssb.publish(content, (err, msg) => {
            t.error(err, 'publish a message')

            ssb.get({ id: msg.key, private: true }, (err, A) => {
              t.error(err, 'get that message back')

              t.deepEqual(
                A.content.tangles.group, // actual
                { root: groupRoot, previous: [groupRoot] }, // expected
                DESCRIPTION + ' (auto added tangles.group)'
              )

              ssb.close()
            })
          })
        })
      }
    }
  ]

  const toRun = tests.reduce((acc, round) => {
    acc += round.plan || 1
    return acc
  }, 0)

  t.plan(toRun)

  tests.forEach(round => round.test(t))
})

test('get-group-tangle with branch', t => {
  const alice = Server()
  const bob = Server()
  const name = (id) => {
    switch (id) {
      case alice.id: return 'alice'
      case bob.id: return 'bob'
    }
  }
  // Alice creates a group
  alice.tribes.create(null, (err, data) => {
    if (err) throw err
    // Prepare to get Alice's group tangle from both servers
    const keystore = {
      group: {
        get (groupId) {
          return { ...data, root: data.groupInitMsg.key } // rootMsgId
        }
      }
    }
    const DELAY = 200
    const _getAliceGroupTangle = GetGroupTangle(alice, keystore)
    const getAliceGroupTangle = (id, cb) => {
      setTimeout(() => _getAliceGroupTangle(id, cb), DELAY)
    }
    const _getBobGroupTangle = GetGroupTangle(bob, keystore)
    const getBobGroupTangle = (id, cb) => {
      setTimeout(() => _getBobGroupTangle(id, cb), DELAY)
    }
    // Alice invites Bob to the group
    const aliceInvite = (...args) => {
      // slow this step down so the group tangle cache has time to be update
      // and be linear
      setTimeout(() => alice.tribes.invite(...args), DELAY)
    }
    aliceInvite(data.groupId, [bob.id], { text: 'ahoy' }, (err, invite) => {
      t.error(err, 'alice adds bob to group') // Not actually an error?

      // Alice shares the group creation and invite with Bob.
      replicate({ from: alice, to: bob, name }, (err) => {
        if (err) throw err
        // Both servers should see the same group tangle
        getAliceGroupTangle(data.groupId, (err, aliceTangle) => {
          if (err) throw err
          getBobGroupTangle(data.groupId, (err, bobTangle) => {
            if (err) throw err
            t.deepEqual(aliceTangle, bobTangle, 'tangles should match')
            t.deepEqual(aliceTangle.root, data.groupInitMsg.key, 'the root is the groupId')
            t.deepEqual(aliceTangle.previous, [invite.key], 'previous is the invite key')

            // Alice and Bob will both publish a message
            const content = () => ({
              type: 'memo',
              message: 'branch',
              recps: [data.groupId]
            })

            alice.publish(content(), (err, msg) => {
              t.error(err, 'alice publishes a new message')

              // NOTE With the content.recps we are adding we are asking Bob to know about a group before he's
              // found out about it for himself
              whenBobHasGroup(data.groupId, () => {
                bob.publish(content(), (err, msg) => {
                  if (err) throw err
                  // Then Bob shares his message with Alice
                  replicate({ from: bob, to: alice, name }, (err) => {
                    if (err) throw err
                    // There should now be a branch in Alice's group tangle
                    getAliceGroupTangle(data.groupId, (err, aliceTangle) => {
                      if (err) throw err

                      t.deepEqual(aliceTangle.previous.length, 2, 'There should be two tips')
                      alice.close()
                      bob.close()
                      t.end()
                    })
                  })
                })
              })
            })
          })
        })
      })
    })
  })

  function whenBobHasGroup (groupId, fn) {
    bob.tribes.get(groupId, (err, data) => {
      if (err) {
        setTimeout(() => {
          console.log('waiting for bob...')
          whenBobHasGroup(groupId, fn)
        }, 100)
      } else fn()
    })
  }
})
