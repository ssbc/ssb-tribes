const test = require('tape')
const keys = require('ssb-keys')
const { Server } = require('../helpers')

test('tribes.listAuthors', (t) => {
  const server = Server()

  server.tribes.create(null, (err, { groupId }) => {
    t.error(err, 'created group')
    const newFriends = Array(6).fill(0).map(() => keys.generate().id)

    server.tribes.invite(groupId, newFriends, { text: 'ahoy' }, (err) => {
      t.error(err, 'invited friends')

      server.tribes.listAuthors(groupId, (err, authors) => {
        if (err) throw err

        t.deepEqual(authors, [server.id, ...newFriends], 'lists authors')

        server.close(t.end)
      })
    })
  })
})
