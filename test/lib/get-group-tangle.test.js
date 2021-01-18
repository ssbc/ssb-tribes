const test = require('tape')
const { Server } = require('../helpers')
const GetGroupTangle = require('../../lib/get-group-tangle')

test('get-group-tangle unit test', t => {
  const name = `get-group-tangle-${Date.now()}`
  const server = Server({ name: name })

  //    - creating a group and publishing messages (ssb-tribes)
  server.tribes.create({}, (err, data) => {
    if (err) throw err
    const keystore = {
      group: {
        get (groupId) {
          return { ...data, root: data.groupInitMsg.key } // rootMsgId
        }
      }
    }
    const getGroupTangle = GetGroupTangle(server, keystore)
    // NOTE: Tribes create callsback with different data than keystore.group.get :(
    // Somebody should probably fix that

    getGroupTangle(data.groupId, (err, { root, previous }) => {
      if (err) throw err
      const rootKey = data.groupInitMsg.key
      t.deepEqual({ root, previous }, { root: rootKey, previous: [rootKey] }, 'root should be tip')
    })

    //  publishing to the group:
    const content = {
      type: 'memo',
      root: data.groupId,
      message: 'unneccessary',
      recps: [data.groupId]
    }

    server.publish(content, (err, msg) => {
      if (err) throw err
      getGroupTangle(data.groupId, (err, { root, previous }) => {
        if (err) throw err
        t.deepEqual({ root, previous }, { root: data.groupInitMsg.key, previous: [msg.key] }, 'adding message to root')
      })

      server.publish(content, (err, msg) => {
        if (err) throw err
        getGroupTangle(data.groupId, (err, { root, previous }) => {
          if (err) throw err
          t.deepEqual({ root, previous }, { root: data.groupInitMsg.key, previous: [msg.key] }, 'adding message to tip')
          server.close()
          t.end()
        })
      })
    })
  })
})

test('get-group-tangle', t => {
  const tests = [
    {
      plan: 4,
      test: (t) => {
        const DESCRIPTION = 'auto adds group tangle'
        // this is an integration test, as we've hooked get-group-tangle into ssb.publish
        const ssb = Server()

        ssb.tribes.create(null, (err, data) => {
          t.error(err, 'create group')

          const groupRoot = data.groupInitMsg.key
          const groupId = data.groupId

          const content = {
            type: 'yep',
            recps: [groupId]
          }

          ssb.publish(content, (err, msg) => {
            t.error(err, 'publish a message')
            console.log('Message in test: ', msg)

            ssb.get({ id: msg.key, private: true }, (err, A) => {
              t.error(err, 'get that message back')

              t.deepEqual(
                A.content.tangles.group, // actual
                { root: groupRoot, previous: [groupRoot] }, // expected
                DESCRIPTION + ' (auto added tangles.group)'
              )

              ssb.close()
            })
          })
        })
      }
    }
  ]

  const toRun = tests.reduce((acc, round) => {
    acc += round.plan || 1
    return acc
  }, 0)

  t.plan(toRun)

  tests.forEach(round => round.test(t))
})
