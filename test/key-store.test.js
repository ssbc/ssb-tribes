const test = require('tape')
const pull = require('pull-stream')
const Server = require('./lib/server')
const { Key, GroupId } = require('./lib/crypto')

test('key-store', t => {
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

/*
 *
 * TODO 
 * - test peristance
 *
    // close and start server to test persistence
    // currently broken as startUnclean no longer works!
    //
    // server.close(() => {
    //
    //   server = Server({ name, startUnclean: true })
    //   ...
    // })
*/
