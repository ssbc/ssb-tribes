const test = require('tape')
const pull = require('pull-stream')
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

/* YUCK, this is kinda an integration test */
// TODO delete??

test('listen.addMember', t => {
  const A = Server() // me
  const B = Server() // some friend

  const messages = []
  let root
  let groupId

  let heardCount = 0
  // NOTE with auto-rebuild active, this listener gets hit twice:
  // 1. first time we see group/add-member (unboxed with DM key)
  // 2. after rebuild
  function checkRebuildDone (done) {
    if (A.status().sync.sync) return done()

    console.log('waiting for rebuild')
    setTimeout(() => checkRebuildDone(done), 500)
  }
  A.on('group/add-member', m => {
    t.equal(m.value.content.root, root, `listened + heard the group/add-member: ${++heardCount}`)

    if (heardCount === 2) {
      checkRebuildDone(() => {
        A.close(err => {
          t.error(err, 'A closed')
          t.end()
        })
      })
    }
  })

  B.tribes.create({}, (err, data) => {
    if (err) throw err

    messages.push(data.groupInitMsg)
    root = data.groupInitMsg.key
    groupId = data.groupId
    console.log(`created group: ${groupId}`)

    B.tribes.invite(groupId, [A.id], { text: 'ahoy' }, (err, invite) => {
      if (err) throw err
      messages.push(invite)
      B.close(err => t.error(err, 'closed B'))

      pull(
        pull.values(messages),
        pull.asyncMap((msg, cb) => {
          msg.value
            ? A.add(msg.value, cb)
            : A.add(msg, cb)
        }),
        pull.through(m => console.log('replicating', m.key)),
        pull.collect((err, msgs) => {
          if (err) throw err

          const pruneTimestamp = m => {
            delete m.timestamp
            return m
          }

          t.deepEqual(
            messages.map(pruneTimestamp),
            msgs.map(pruneTimestamp),
            'same messages in two logs'
          )
        })
      )
    })
  })
})
