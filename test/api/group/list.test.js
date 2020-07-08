const test = require('tape')
const { Server } = require('../../helpers')

test('list + get groups', (t) => {
  const server = Server()

  server.tribes.create(null, (err, data) => {
    t.error(err)
    t.deepEqual(server.tribes.list(), [data.groupId])

    const actualGroup = server.tribes.get(data.groupId)
    const expectedGroup = {
      key: data.groupKey,
      root: data.groupInitMsg.key,
      scheme: 'envelope-large-symmetric-group'
    }
    t.deepEqual(actualGroup, expectedGroup)

    server.close(t.end)
  })
})
