const test = require('tape')
const pull = require('pull-stream')

const { Server } = require('./helpers')
const { FeedId } = require('../lib/cipherlinks')

function replicate ({ from, to, through = noop }) {
  pull(
    from.createHistoryStream({ id: from.id, live: true }),
    pull.through(through),
    pull.drain(m => {
      to.add(m.value, (err) => {
        if (err) throw err
        console.log(`replicated ${m.key}`)
      })
    })
  )
}
function noop () {}

test('rebuild', t => {
  const me = Server() // me
  const admin = Server() // some friend

  var messages = []
  replicate({
    from: admin,
    to: me,
    through: m => messages.push(m.key)
  })

  var groupId

  me.rebuild.hook(function (rebuild, [cb]) {
    t.pass('I automatically call a rebuild')

    rebuild(() => {
      cb()
      t.true(me.status().sync.sync, 'all indexes updated') // 2

      pull(
        me.createUserStream({ id: admin.id, private: true }),
        pull.drain(
          m => {
            t.equal(typeof m.value.content, 'object', `I auto-unbox msg of type: ${m.value.content.type}`)
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

  admin.tribes.create({}, (err, data) => {
    if (err) throw err

    groupId = data.groupId
    console.log(`created group: ${groupId}`)

    admin.tribes.invite(groupId, [me.id], { text: 'ahoy' }, (err, invite) => {
      t.error(err, 'admin adds me to group')
      if (err) throw err
    })
  })
})

test('rebuild (not called when I invite another member)', t => {
  const server = Server()

  var rebuildCalled = false
  server.rebuild.hook(function (rebuild, args) {
    rebuildCalled = true

    rebuild(...args)
  })

  server.tribes.create(null, (err, data) => {
    t.error(err, 'I create a group')

    const { groupId } = data
    const feedId = new FeedId().mock().toSSB()

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
