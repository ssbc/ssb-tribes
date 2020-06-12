const test = require('tape')
const pull = require('pull-stream')

const listen = require('../listen')
const { Server } = require('./helpers')

test('listen.addMember', t => {
  const A = Server() // me
  const B = Server() // some friend

  var messages = []
  var root
  var groupId

  // TODO test addMember continues after a rebuild
  listen.addMember(A)(m => {
    // WIP error in here somewhere
    t.equal(m.value.content.root, root, 'listened + heard the group/add-member')

    A.close()
    t.end()
  })

  B.private2.group.create({}, (err, data) => {
    if (err) throw err

    messages.push(data.groupInitMsg)
    root = data.groupInitMsg.key
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
