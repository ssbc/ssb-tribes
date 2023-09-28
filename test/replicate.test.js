const test = require('tape')
const { promisify: p } = require('util')
const Keys = require('ssb-keys')
const { Server, replicate } = require('./helpers')

test('replicate group members', t => {
  t.plan(7)
  // 3 calls to request
  // 1 successful shutdown
  // 1 successful restart
  // 1 collect seeing the previously requested peers requested again

  // this checks that if a person is in your group then you will be replicating them
  // required to make sure you have all content

  const expected = [
    'bob', // initial replicate call
    'bob',
    'cel',
    'eric'
  ]

  const aliceName = 'alice-' + Date.now()
  const aliceKeys = Keys.generate()

  let alice = Server({ name: aliceName, keys: aliceKeys, installReplicate: true })
  const bob = Server()
  const celId = '@f/6sQ6d2CMxRUhLpspgGIulDxDCwYD7DzFzPNr7u5AU=.ed25519'
  const ericId = '@FrhvDFmy9Taz8V94LgOBIOTUbyIaeluRlyFIceiYG4w=.ed25519'
  const name = (id) => {
    if (id === alice.id) return 'alice'
    if (id === bob.id) return 'bob'
    if (id === celId) return 'cel'
    if (id === ericId) return 'eric'
    return id
  }

  let i = 0

  replicate({ from: bob, to: alice, name, live: true })

  alice.replicate.request.hook((request, args) => {
    const n = name(args[0].id)

    t.equal(n, expected[i], `replicates ${expected[i]}`)
    i++

    request(...args)

    if (i === expected.length) testPersistence()
  })

  p(alice.tribes.create)({}).then(({ groupId: aliceGroup }) => {
    return p(alice.tribes.invite)(aliceGroup, [bob.id], {})
  }).then(() => {
    return p(bob.tribes.create)({})
  }).then(({ groupId: bobGroup }) => {
    return p(bob.tribes.invite)(bobGroup, [alice.id, celId, ericId], {})
  }).catch((err) => {
    t.fail(err)
  })

  function testPersistence () {
    // NOTE: Currently we do not persist membership because it's simpler.
    // If we decide to re-instate this, or re-instate initialization which loads state into memory
    // (another solution to the same problem) then this code below will be useful and the `t.pass()`
    // and early `return` should be reverted.
    // TODO: remove this when we re-add member list persistence
    //
    t.pass('')
    t.pass('')
    t.pass('')
    // needed for windows tests not to fail D:
    setTimeout(() => {
      alice.close()
      bob.close()
    }, 150)
    return
    /* eslint-disable no-unreachable */

    const requested = []
    alice.close((err) => {
      t.error(err, 'shutdown (alice)')

      try {
        alice = Server({ name: aliceName, keys: aliceKeys, installReplicate: true, startUnclean: true })
        alice.replicate.request.hook((request, args) => {
          const n = name(args[0].id)
          requested.push(n)
          if (requested.length === expected.length) setTimeout(finish, 500)
          // setTimeout is rough way to call ready to compare results
          // - we don't want to just run comparison if we have 3 results... what if there were 10!
          // - leaves space for other requests to sneek in

          request(...args)
        })
        t.pass('restart (alice)')
      } catch (err) {
        t.fail(err)
        finish()
      }
    })

    function finish () {
      t.deepEqual(requested.sort(), expected.sort(), 'replication of peers in groups persisted')
      alice.close()
      bob.close() // leave bob closing here to stop windows closing the tests when we shut alice down?
    }
  }
})
