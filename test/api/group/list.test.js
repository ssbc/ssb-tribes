const test = require('tape')
const { Server } = require('../../helpers')

let keys

test('list + get groups', (t) => {
  const server = Server({ name: 'list' })
  keys = server.keys
  server.tribes.create(null, (err, data) => {
    t.error(err)
    server.tribes.list((err, list) => {
      t.error(err)
      t.deepEqual(list, [data.groupId])

      server.tribes.get(data.groupId, (err, actualGroup) => {
        t.error(err)
        const expectedGroup = {
          key: data.groupKey,
          root: data.groupInitMsg.key,
          scheme: 'envelope-large-symmetric-group'
        }
        t.deepEqual(actualGroup, expectedGroup)

        server.close(t.end)
      })
    })
  })
})

test('list + get groups', (t) => {
  const server = Server({ name: 'list', startUnclean: true, keys })

  server.tribes.list((err, list) => {
    t.error(err)
    t.equal(list.length, 1)
    server.close(t.end)
  })
})
