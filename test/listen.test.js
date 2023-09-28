const test = require('tape')
const { promisify: p } = require('util')
const pull = require('pull-stream')

const { Server, replicate } = require('./helpers')
const listen = require('../listen')

// TODO this is... not listen any more
// we may need to rename this

test('listen.addMember', t => {
  const alice = Server()
  const bob = Server()

  let aliceHeard = 0
  let bobHeard = 0

  let groupId

  pull(
    listen.addMember(alice),
    pull.drain(m => {
      const { recps } = m.value.content
      if (recps.length !== 2) throw new Error('bad add-member')

      switch (++aliceHeard) {
        case 1: return t.equal(recps[1], alice.id, 'alice: hears own "add self"')
        case 2: return t.equal(recps[1], bob.id, 'alice: hears "add bob"')
        default: t.fail('should not be here')
      }
    }, (err) => {
      if (err) t.fail(err)
    })
  )

  pull(
    listen.addMember(bob),
    pull.drain(m => {
      const { recps } = m.value.content
      if (recps.length !== 2) throw new Error('bad add-member')

      switch (++bobHeard) {
        case 1: return t.equal(recps[1], bob.id, 'bob: discovers "add bob"... rebuilds')
        case 2: return t.equal(recps[1], alice.id, 'bob: discovers "add alice" from alice')
        case 3: return t.equal(recps[1], bob.id, 'bob: re-emits "add bob"')
        default: t.fail('should not be here')
      }
    }, (err) => {
      if (err) t.fail(err)
    })
  )

  p(alice.tribes.create)({}).then((groupData) => {
  groupId = groupData.groupId // eslint-disable-line
    return p(alice.tribes.invite)(groupId, [bob.id], {})
  }).then(() => {
    return p(replicate)({ from: alice, to: bob })
  }).then(() => {
    setTimeout(() => {
      t.equal(aliceHeard, 2, 'alice: heard add-members [[alice], [bob]]')
      t.equal(bobHeard, 2, 'bob heard add-members [[bob], [admin]]')

      alice.close()
      bob.close()
      t.end()
    }, 500)
  })
})

test('listen.poBox', t => {
  const alice = Server()
  const bob = Server()

  let aliceHeard = 0
  let bobHeard = 0

  listen.poBox(alice, m => aliceHeard++)
  listen.poBox(bob, m => bobHeard++)

  p(alice.tribes.create)({ addPOBox: true }).then(({ groupId }) => {
    return p(alice.tribes.invite)(groupId, [bob.id], {})
  }).then(() => {
    return p(replicate)({ from: alice, to: bob })
  }).then(() => {
    setTimeout(() => {
      t.equal(aliceHeard, 1, 'alice heard own po-box')
      t.equal(bobHeard, 1, 'bob heard po-box')

      alice.close()
      bob.close()
      t.end()
    }, 500) // wait for bob to do two rebuilds
  })
})
