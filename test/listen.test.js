const test = require('tape')
const pull = require('pull-stream')

const listen = require('../listen')
const GroupId = require('../lib/group-id')
const { Server } = require('./helpers')

test('listen.addMember', t => {
  const A = Server()
  const B = Server()

  var messages = []
  var root
  var groupId

  listen.addMember(A)(m => {
    t.equal(m.value.content.root, root, 'listened + heard the group/add-member')

    console.log('getting group/init', root)
    A.get({ id: root, private: false, meta: true }, (err, groupInitMsg) => {
      // we shouldn't be able to auto-decrypt the group/init yet
      if (err) throw err
      // !!! this flumeview-level error !
      t.equal(GroupId({ groupInitMsg }), groupId, 'can calculate correct groupId (integration test)')

      A.close()
      t.end()
    })
  })

  B.publish({ type: 'filler' }, (_, msg) => {
    messages.push(msg)
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
          pull.through(m => console.log('replciating', m.key)),
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
})
