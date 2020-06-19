const test = require('tape')
const { Server } = require('../helpers')

test('get-group-tangle', t => {
  const tests = [
    {
      plan: 4,
      test: (t) => {
        const DESCRIPTION = 'auto adds group tangle'
        // this is an integration test, as we've hooked get-group-tangle into ssb.publish
        const ssb = Server()

        ssb.private2.group.create(null, (err, data) => {
          t.error(err, 'create group')

          const groupRoot = data.groupInitMsg.key
          const groupId = data.groupId

          const content = {
            type: 'yep',
            recps: [groupId]
          }

          ssb.publish(content, (err, msg) => {
            t.error(err, 'publish a message')

            ssb.get({ id: msg.key, private: true }, (err, A) => {
              t.error(err, 'get that message back')

              t.deepEqual(
                A.content.tangles.group,
                { root: groupRoot, previous: [groupRoot] },
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
