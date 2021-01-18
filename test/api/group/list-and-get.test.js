const test = require('tape')
const { Server } = require('../../helpers')

test('list + get groups', (t) => {
  const name = `list-and-get-groups-${Date.now()}`
  let server = Server({ name: name })
  const keys = server.keys

  server.tribes.create(null, (err, data) => {
    t.error(err, 'create group')

    server.tribes.list((err, list) => {
      if (err) throw err
      t.deepEqual(list, [data.groupId], 'lists group ids')

      server.tribes.get(data.groupId, (err, actualGroup) => {
        if (err) throw err

        const expectedGroup = {
          key: data.groupKey,
          root: data.groupInitMsg.key,
          scheme: 'envelope-large-symmetric-group'
        }
        t.deepEqual(actualGroup, expectedGroup, 'gets group data')

        server.close(err => {
          t.error(err, 'closes server')

          server = Server({ name: name, startUnclean: true, keys })
          server.tribes.list((err, newList) => {
            if (err) throw err

            t.deepEqual(newList, list, 'list returns save results after restart')
            server.close(t.end)
          })
        })
      })
    })
  })
})
