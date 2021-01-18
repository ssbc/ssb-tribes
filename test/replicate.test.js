const test = require('tape')
const { promisify: p } = require('util')
const Keys = require('ssb-keys')
const { Server, replicate } = require('./helpers')

test('replicate group members', async t => {

  const expected = [
    'bob',
    'cel',
    'eric'
  ]
  t.plan(expected.length + 2) // first time, then persisted (which collects results)

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

  alice.replicate.request.hook((request, args) => {
    const n = name(args[0].id)

    t.equal(n, expected[i], `replicates ${expected[i]}`)
    i++

    request(...args)

    if (i === expected.length) testPersistence()
  })

  const { groupId: aliceGroup } = await p(alice.tribes.create)({})
  await p(alice.tribes.invite)(aliceGroup, [bob.id], {})

  const { groupId: bobGroup } = await p(bob.tribes.create)({})
  await p(bob.tribes.invite)(bobGroup, [alice.id, celId, ericId], {})

  replicate({ from: bob, to: alice, name })

  function testPersistence () {
    bob.close()

    const requested = []
    alice.close(err => {
      t.error(err, 'restarting alice')
      alice = Server({ name: aliceName, keys: aliceKeys, installReplicate: true, startUnclean: true })
      alice.replicate.request.hook((request, args) => {
        const n = name(args[0].id)
        requested.push(n)
        if (requested.length === expected.length) setTimeout(next, 500)
        // setTimeout is rough way to call ready to compare results
        // - we don't want to just run comparison if we have 3 results... what if there were 10!
        // - leaves space for other requests to sneek in

        request(...args)
      })
    })

    function next () {
      t.deepEqual(requested.sort(), expected.sort(), 'replication of peers in groups persisted')
      alice.close()
    }
  }
})
