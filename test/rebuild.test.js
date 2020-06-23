const test = require('tape')
const pull = require('pull-stream')

const { Server } = require('./helpers')
const { FeedId } = require('../lib/cipherlinks')

test('rebuild', t => {
  const A = Server() // me
  const B = Server() // some friend

  var messages = []
  var groupId

  A.rebuild.hook(function (fn, [cb]) {
    t.pass('rebuild called!')
    const replacementCb = () => {
      messages.forEach(({ key }, i) => {
        A.get({ id: key, private: true }, (err, val) => {
          if (err) throw err
          t.equal(typeof val.content, 'object', `auto-unboxes ${val.content.type}`)
        })
      })

      A.close()
      t.end()
      cb()
    }

    fn.apply(this, [replacementCb])
  })

  B.tribes.create({}, (err, data) => {
    if (err) throw err

    messages.push(data.groupInitMsg)
    groupId = data.groupId
    console.log(`created group: ${groupId}`)

    B.tribes.invite(groupId, [A.id], { text: 'ahoy' }, (err, invite) => {
      if (err) throw err
      messages.push(invite)
      B.close()

      pull(
        pull.values(messages),
        pull.asyncMap((msg, cb) => {
          msg.value
            ? A.add(msg.value, cb)
            : A.add(msg, cb)
        }),
        // pull.through(m => console.log('replicating', m.key)),
        pull.collect(err => {
          if (err) throw err
        })
      )
    })
  })
})

test('rebuild (not called from own add-member)', t => {
  const server = Server()

  server.rebuild.hook(function (fn, [cb]) {
    t.error(new Error('should not be rebuilding'))

    fn.apply(this, [cb])
  })

  server.tribes.create(null, (err, data) => {
    t.error(err, 'no error')

    const { groupId } = data
    const feedId = new FeedId().mock().toSSB()

    server.tribes.invite(groupId, [feedId], {}, (err) => {
      t.error(err, 'no error')

      setTimeout(() => {
        server.close()
        t.end()
      }, 1e3)
    })
  })
})
