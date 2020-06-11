const test = require('tape')
const pull = require('pull-stream')

const { Server } = require('./helpers')

test('rebuild', t => {
  const A = Server() // me
  const B = Server() // some friend

  var messages = []
  var groupId

  A.rebuild.hook(function (fn, [cb]) {
    t.pass('rebuild called!')

    fn.apply(this, [() => {
      console.log('TODO test can GET unboxed here!')

      // WIP

      A.close()
      t.end()
      cb()
    }])
  })

  B.private2.group.create({}, (err, data) => {
    if (err) throw err

    messages.push(data.groupInitMsg)
    groupId = data.groupId
    console.log(`created group: ${groupId}`)

    B.private2.group.invite(groupId, [A.id], { text: 'ahoy' }, (err, invite) => {
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
