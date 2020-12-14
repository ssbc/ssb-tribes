const test = require('tape')
const { promisify: p } = require('util')
const { Server, replicate } = require('./helpers')

test.only('replicate group members', async t => {
  const alice = Server({ installReplicate: true })
  const bob = Server()
  const celId = '@f/6sQ6d2CMxRUhLpspgGIulDxDCwYD7DzFzPNr7u5AU=.ed25519'
  const ericId = '@FrhvDFmy9Taz8V94LgOBIOTUbyIaeluRlyFIceiYG4w=.ed25519'
  const name = (id) => {
    if (id === alice.id) return 'alice'
    if (id === bob.id) return 'bob'
    if (id === celId) return 'cel'
    if (id === ericId) return 'eric'
  }

  const expected = [
    'bob',
    'cel',
    'eric'
  ]
  let i = 0

  alice.replicate.request.hook((request, args) => {
    const n = name(args[0].id)

    t.equal(n, expected[i], `replicates ${expected[i]}`)
    i++

    request(...args)

    if (i < expected.length) return
    alice.close()
    bob.close()
    t.end()
  })

  const { groupId: aliceGroup } = await p(alice.tribes.create)({})
  await p(alice.tribes.invite)(aliceGroup, [bob.id], {})

  const { groupId: bobGroup } = await p(bob.tribes.create)({})
  await p(bob.tribes.invite)(bobGroup, [alice.id, celId, ericId], {})

  replicate({ from: bob, to: alice, name })
})
