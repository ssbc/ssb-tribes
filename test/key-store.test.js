const test = require('tape')
const pull = require('pull-stream')
const Server = require('./server')
const { Key, GroupId } = require('./crypto')

test('key-store (happy path)', t => {
  const name = `test-${Date.now()}`

  var server = Server({ name })

  const pair1 = { groupId: GroupId(), groupKey: Key() }
  const pair2 = { groupId: GroupId(), groupKey: Key() }

  pull(
    pull.values([pair1, pair2]),
    pull.asyncMap(server.private2.keys.add),
    pull.collect((err, successes) => {
      t.deepEqual([err, successes], [null, [true, true]], 'adds valid key without error')

      server.private2.keys.list((_, list) => {
        const expected = {
          [pair1.groupId]: pair1.groupKey,
          [pair2.groupId]: pair2.groupKey
        }
        t.deepEqual(list, expected, 'can retrieve all keys')

        server.private2.keys.remove(pair1.groupId, () => {
          server.private2.keys.list((_, list) => {
            const expected = {
              [pair2.groupId]: pair2.groupKey
            }
            t.deepEqual(list, expected, 'can remove keys')

            server.close()
            t.end()
          })
        })
      })
    })
  )
})

test('key-store (unhappy path)', t => {
  const server = Server()
  const groupId = Key()
  const groupKey = 'dog' // << no

  server.private2.keys.add({ groupId, groupKey }, (err, success) => {
    t.true(err && err.message.match(/invalid groupKey/), 'cannot add invalid groupKey')
    server.close()
    t.end()
  })
})

/*
 * TODO
 * - test peristance?
 *   - currently this api is broken: Server({ name, startUnclean: true })
 * - test bad groupId
 * - test bad groupKey
*/
