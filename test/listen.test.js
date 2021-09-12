const test = require('tape')
const { promisify: p } = require('util')

const { Server, replicate } = require('./helpers')
const listen = require('../listen')

// TODO this is... not listen any more
// we may need to rename this

test('listen.addMember', async t => {
  const me = Server()
  const friend = Server()

  let iHeard = 0
  let friendHeard = 0

  listen.addMember(me, m => {
    iHeard++
    // TODO test what came through, what is m
  })
  listen.addMember(friend, m => friendHeard++)

  const { groupId } = await p(me.tribes.create)({})
  await p(me.tribes.invite)(groupId, [friend.id], {})
  await p(replicate)({ from: me, to: friend })

  setTimeout(() => {
    t.equal(iHeard, 1, 'I heard my own add-member')
    t.equal(friendHeard, 2, 'friend heard add-member 2 times')
    // this happens twice:
    // - 1st one is the group/add-member that is DM'd to them, this leads to a rebuild
    // - 2nd happens after the rebuild is complete and the pull-stream is restarted, now seeing
    //   all the group messages (including the group/add-member which added them
    me.close()
    friend.close()
    t.end()
  }, 500)
})

test('listen.poBox', async t => {
  const me = Server()
  const friend = Server()

  let iHeard = 0
  let friendHeard = 0

  listen.poBox(me, m => {
    iHeard++
  })
  listen.poBox(friend, m => friendHeard++)

  const { groupId } = await p(me.tribes.create)({ addPOBox: true })
  await p(me.tribes.invite)(groupId, [friend.id], {})

  await p(replicate)({ from: me, to: friend })

  setTimeout(() => {
    t.equal(iHeard, 1, 'I heard my own po-box')
    t.equal(friendHeard, 1, 'friend heard po-box')
    // only seen once and this was encrypted to the group, and only seen after rebuild
    me.close()
    friend.close()
    t.end()
  }, 500)
})
