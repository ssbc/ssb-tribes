const test = require('tape')
const pull = require('pull-stream')
const { promisify: p } = require('util')
const { where, and, author, isDecrypted, toPullStream } = require('ssb-db2/operators')

const { Server, replicate, FeedId } = require('./helpers')

function nMessages (n, { type = 'post', recps } = {}) {
  return new Array(20).fill(type).map((val, i) => {
    const content = { type, count: i }
    if (recps) content.recps = recps
    return content
  })
}

test('rebuild (I am added to a group)', async t => {
  const admin = Server()
  const me = Server()
  const name = (id) => {
    switch (id) {
      case admin.id: return 'admin'
      case me.id: return 'me'
    }
  }

  /* kick off the process */
  const data = await p(admin.tribes.create)({})

  await p(admin.tribes.invite)(data.groupId, [me.id], { text: 'ahoy' })

  await replicate({ from: admin, to: me, name })

  // time for rebuilding
  await p(setTimeout)(500)

  t.true(me.status().sync.sync, 'all indexes updated')

  const msgs = await pull(
    me.db.query(
      where(and(
        author(admin.id), 
        isDecrypted('box2'),
      )),
      toPullStream()
    ),
    pull.map(m => {
      t.equal(typeof m.value.content, 'object', `I auto-unbox msg: ${m.value.content.type}`)
      return m
    }),
    pull.collectAsPromise()
  )

  t.equal(msgs.length, 3, "we got 3 messages to auto unbox")

  await Promise.all([
    p(admin.close)(),
    p(me.close)(),
  ])
})

test('rebuild (I am added to a group, then someone else is added)', t => {
  // t.plan(9)
  const admin = Server()
  const me = Server()
  const bob = Server()
  const zelfId = FeedId()
  const name = (id) => {
    switch (id) {
      case admin.id: return 'admin'
      case me.id: return 'me'
      case bob.id: return 'bob'
      case zelfId: return 'zelf'
    }
  }
  let groupId

  // Setting up listeners ready for initial action

  replicate({ from: admin, to: me, name, live: true })
  replicate({ from: admin, to: bob, name, live: true })

  admin.rebuild.hook(function (rebuild, [cb]) {
    t.fail('admin should not rebuild')
    throw new Error('stop')
  })

  /* after I am added, admin adds bob */
  let myRebuildCount = 0
  me.rebuild.hook(function (rebuild, [cb]) {
    myRebuildCount++
    if (myRebuildCount > 2) throw new Error('I should only rebuild twice!')
    // 1st time - I realise I've been added to a group, and re-index
    // 2nd time - I am re-indexing, and discover zelf was added too

    rebuild(() => {
      cb && cb()

      if (myRebuildCount === 1) t.pass('I am in the group')
      if (myRebuildCount === 2) {
        // I publish 20 messages to the group
        pull(
          pull.values(nMessages(20, { type: 'me', recps: [groupId] })),
          pull.asyncMap(me.tribes.publish),
          pull.collect((err) => {
            t.error(err, 'I publish 20 messages to the group')

            replicate({ from: me, to: bob, name, live: false }, (err) => {
              t.error(err, 'bob has received all of admin + me messages to date')

              // NOTE: we close me here to stop re-indexing when admin adds bob to group
              // If you close while rebuilding, you get a segmentation fault
              me.close((err) => {
                t.error(err, 'I shut down')
                admin.tribes.invite(groupId, [bob.id], { text: 'hi!' }, (err) => {
                  t.error(err, 'admin adds bob to the group')
                })
              })
            })
          })
        )
      }
    })
  })

  let rebuildCount = 0
  bob.rebuild.hook(function (rebuild, [cb]) {
    const _count = ++rebuildCount

    switch (_count) {
      case 1:
        t.pass('bob calls rebuild (added to group)')
        break
      case 2:
        t.pass('bob calls rebuild (realises me + zelf are in group)')
        break
      default:
        t.fail(`rebuild called too many times: ${_count}`)
    }

    rebuild(() => {
      cb && cb()
      if (_count !== 2) return

      /* check can see all of my group messages */
      let seenMine = 0
      pull(
        bob.createLogStream({ private: true }),
        pull.map(m => m.value.content),
        pull.drain(
          ({ type, count, recps }) => {
            let comment = `bob auto-unboxes: ${type} `

            if (type === 'group/add-member') {
              comment += `: ${recps.filter(r => r[0] === '@').map(name)}`
            }
            if (type === 'me') {
              seenMine++
              if (count === 0 || count === 19) comment += `(${count})`
              else if (count === 1) comment += '...'
              else return
            }
            t.true(type, comment) // 3 asserts here
          },
          (err) => {
            if (seenMine === 20) t.equal(seenMine, 20, 'bob saw 20 messages from me')
            if (err) throw err
            bob.close()
            admin.close()
            t.end()
          }
        )
      )
    })
  })

  // Action which kicks everthing off starts here

  /* admin adds alice + zelf to a group */
  admin.tribes.create({}, (err, data) => {
    if (err) throw err

    groupId = data.groupId
    admin.tribes.invite(groupId, [me.id], { text: 'ahoy' }, (err) => {
      t.error(err, 'admin adds alice to group')

      setTimeout(() => {
        // we do this seperately to test if rebuild gets called 2 or 3 times
        // should wait till indexing done before rebuilding again
        admin.tribes.invite(groupId, [zelfId], { text: 'ahoy' }, (err) => {
          t.error(err, 'admin adds zelf to group')
          if (err) throw err
        })
      }, 1000)
    })
  })
})

test('rebuild (not called when I invite another member)', t => {
  const server = Server()

  let rebuildCalled = false
  server.rebuild.hook(function (rebuild, args) {
    rebuildCalled = true

    rebuild(...args)
  })

  server.tribes.create(null, (err, data) => {
    t.error(err, 'I create a group')

    const { groupId } = data
    const feedId = FeedId()

    server.tribes.invite(groupId, [feedId], {}, (err) => {
      t.error(err, 'I add someone to the group')

      setTimeout(() => {
        t.false(rebuildCalled, 'I did not rebuild my indexes')
        server.close()
        t.end()
      }, 1e3)
    })
  })
})

test('rebuild from listen.addMember', t => {
  // NOTE this is some old test... may no longer be needed

  const A = Server() // me
  A.name = 'me'
  const B = Server() // friend
  B.name = 'friend'

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
  pull(
    A.messagesByType({ type: 'group/add-member', private: true, live: true }),
    pull.filter(m => !m.sync),
    pull.drain(m => {
      t.equal(m.value.content.root, root, `listened + heard the group/add-member: ${++heardCount}`)
      // add-member:
      // (1) B creates group, then adds self
      // (2) B invites A

      if (heardCount === 2) {
        checkRebuildDone(() => {
          A.close(err => {
            t.error(err, 'A closed')
            t.end()
          })
        })
      }
    })
  )

  B.tribes.create({}, (err, data) => {
    if (err) throw err

    root = data.groupInitMsg.key
    groupId = data.groupId
    t.pass(`created group: ${groupId}`)

    B.tribes.invite(groupId, [A.id], { text: 'ahoy' }, (err, invite) => {
      if (err) throw err

      replicate({ from: B, to: A }, (err) => {
        t.error(err, 'replicate finshed')
        B.close(err => t.error(err, 'closed B'))
      })
    })
  })
})

test('rebuild (I learn about a new PO Box)', t => {
  const admin = Server()
  const me = Server()
  const name = (id) => {
    switch (id) {
      case admin.id: return 'admin'
      case me.id: return 'me'
    }
  }

  let groupId
  replicate({ from: admin, to: me, name, live: true })

  /* set up listener */
  let rebuildCount = 0
  me.rebuild.hook((rebuild, [cb]) => {
    rebuildCount++
    const run = rebuildCount
    if (rebuildCount === 1) t.pass('rebuild started (group/add-member)')
    else if (rebuildCount === 2) t.pass('rebuild started (group/po-box)')
    else throw new Error(`rebuild triggered ${rebuildCount} times `)

    rebuild((err) => {
      cb && cb()

      if (run === 1) {
        t.error(err, 'rebuild finished (group/add-member)')
        admin.tribes.addPOBox(groupId, (err) => t.error(err, 'admin adds po-box'))
      } // eslint-disable-line
      else if (run === 2) {
        t.error(err, 'rebuild finished (group/po-box)')
        admin.close()
        me.close()
        t.end()
      }
    })
  })

  /* kick off the process */
  admin.tribes.create({}, (err, data) => {
    if (err) throw err
    groupId = data.groupId

    admin.tribes.invite(data.groupId, [me.id], { text: 'ahoy' }, (err, invite) => {
      t.error(err, 'admin adds me to group')
      if (err) throw err
    })
  })
})

test('rebuild (added to group with poBox)', t => {
  const admin = Server()
  const me = Server()
  const name = (id) => {
    switch (id) {
      case admin.id: return 'admin'
      case me.id: return 'me'
    }
  }

  /* set up listener */
  let rebuildCount = 0
  me.rebuild.hook((rebuild, [cb]) => {
    rebuildCount++
    if (rebuildCount === 1) t.pass('rebuild started (group/add-member)')
    else if (rebuildCount === 2) t.pass('rebuild started (group/po-box)')
    else throw new Error(`rebuild triggered ${rebuildCount} times `)

    const run = rebuildCount
    rebuild((err) => {
      cb && cb()

      if (run === 1) {
        t.error(err, 'rebuild finished (group/add-member)')
      } // eslint-disable-line
      else if (run === 2) {
        t.error(err, 'rebuild finished (group/po-box)')
        admin.close()
        me.close()
        t.end()
      }
    })
  })

  /* kick off the process */
  admin.tribes.create({ addPOBox: true }, (err, data) => {
    if (err) throw err

    replicate({ from: admin, to: me, name, live: true })

    admin.tribes.invite(data.groupId, [me.id], { text: 'ahoy' }, (err, invite) => {
      t.error(err, 'admin adds me to group')
      if (err) throw err
    })
  })
})
