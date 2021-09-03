const test = require('tape')
const pull = require('pull-stream')

const { Server, replicate, FeedId } = require('./helpers')

function nMessages (n, { type = 'post', recps } = {}) {
  return new Array(20).fill(type).map((val, i) => {
    const content = { type, count: i }
    if (recps) content.recps = recps
    return content
  })
}

test('rebuild (I am added to a group)', t => {
  const admin = Server()
  const me = Server()
  const name = (id) => {
    switch (id) {
      case admin.id: return 'admin'
      case me.id: return 'me'
    }
  }

  replicate({ from: admin, to: me, name, live: true })

  /* set up listener */
  me.rebuild.hook(function (rebuild, [cb]) {
    t.pass('I automatically call a rebuild')

    rebuild(() => {
      cb()
      t.true(me.status().sync.sync, 'all indexes updated') // 2

      pull(
        me.createUserStream({ id: admin.id, private: true }),
        pull.drain(
          m => {
            t.equal(typeof m.value.content, 'object', `I auto-unbox msg: ${m.value.content.type}`)
          },
          (err) => {
            if (err) throw err
            admin.close()
            me.close()
            t.end()
          }
        )
      )
    })
    t.false(me.status().sync.sync, 'all indexes updating') // 1
  })

  /* kick off the process */
  admin.tribes.create({}, (err, data) => {
    if (err) throw err

    admin.tribes.invite(data.groupId, [me.id], { text: 'ahoy' }, (err, invite) => {
      t.error(err, 'admin adds me to group')
      if (err) throw err
    })
  })
})

test('rebuild (I am added to a group, then add someone else)', t => {
  const admin = Server()
  const alice = Server() // me
  const bob = Server() // someone else
  const zelfId = FeedId()
  const name = (id) => {
    switch (id) {
      case admin.id: return 'admin'
      case alice.id: return 'alice'
      case bob.id: return 'bob  '
    }
  }

  let groupId
  replicate({ from: admin, to: alice, name, live: true })
  replicate({ from: admin, to: bob, name, live: true })

  /* after alice has been added, she adds bob */
  alice.rebuild.hook(function (rebuild, [cb]) {
    rebuild(() => {
      t.pass('alice is in the group')

      cb()
      pull(
        pull.values(nMessages(20, { type: 'alice', recps: [groupId] })),
        pull.asyncMap(alice.publish),
        pull.collect((err) => {
          t.error(err, 'alice publishes to the group')

          replicate({ from: alice, to: bob, name, live: false }, (err) => {
            t.error(err, 'bob has received all of admin + alices messages to date')
            alice.close()
            // NOTE: we close alice here to stop her from re-indexing
            // when we add bob is added to the group
            // If you close while rebuilding, you get a segmentation fault
            admin.tribes.invite(groupId, [bob.id], { text: 'hi!' }, (err) => {
              t.error(err, 'admin adds bob to the group')
            })
          })
        })
      )
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
        t.pass('bob calls rebuild (realises alice + zelf are in group)')
        break
      default:
        t.fail(`rebuild called too many times: ${_count}`)
    }

    rebuild(() => {
      cb()
      if (_count !== 2) return

      /* check can see all of alices group messages */
      let seenAlices = 0
      pull(
        bob.createLogStream({ private: true }),
        pull.map(m => m.value.content),
        pull.drain(
          ({ type, count, recps }) => {
            let comment = `bob auto-unboxes: ${type} `

            if (type === 'group/add-member') {
              comment += `: ${recps.filter(r => r[0] === '@').map(name)}`
            }
            if (type === 'alice') {
              seenAlices++
              if (count === 0 || count === 19) comment += `(${count})`
              else if (count === 1) comment += '...'
              else return
            }
            t.true(type, comment)
          },
          (err) => {
            if (seenAlices === 20) t.equal(seenAlices, 20, 'saw 20 messages from alice')
            if (err) throw err
            bob.close()
            admin.close()
            t.end()
          }
        )
      )
    })
  })

  /* admin adds alice + zelf to a group */
  admin.tribes.create({}, (err, data) => {
    if (err) throw err

    groupId = data.groupId
    admin.tribes.invite(groupId, [alice.id], { text: 'ahoy' }, (err) => {
      t.error(err, 'admin adds alice to group')

      // we do this seperately to test if rebuild gets called 2 or 3 times
      // should wait till indexing done before rebuilding again
      admin.tribes.invite(groupId, [zelfId], { text: 'ahoy' }, (err) => {
        t.error(err, 'admin adds zelf to group')
        if (err) throw err
      })
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
