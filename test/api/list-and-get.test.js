const test = require('tape')
const { promisify: p } = require('util')

const { Server } = require('../helpers')

test('tribes.list + tribes.get', (t) => {
  const name = `list-and-get-groups-${Date.now()}`
  let server = Server({ name })
  const keys = server.keys

  server.tribes.create(null, (err, data) => {
    t.error(err, 'create group')

    server.tribes.list((err, list) => {
      if (err) throw err
      t.deepEqual(list, [data.groupId], 'lists group ids')

      server.tribes.get(data.groupId, (err, actualGroup) => {
        if (err) throw err

        const key = data.groupKey
        const scheme = 'envelope-large-symmetric-group'
        const expectedGroup = {
          writeKey: {
            key,
            scheme
          },
          readKeys: [
            {
              key,
              scheme
            }
          ],
          root: data.groupInitMsg.key,
          groupId: data.groupId
        }
        t.deepEqual(actualGroup, expectedGroup, 'gets group data')

        server.close(err => {
          t.error(err, 'closes server')

          server = Server({ name, startUnclean: true, keys })
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

test('tribes.list (subtribes)', async (t) => {
  const server = Server()

  const { groupId } = await p(server.tribes.create)({})
  const { groupId: subGroupId } = await p(server.tribes.subtribe.create)(groupId, {})

  let list = await p(server.tribes.list)()

  t.deepEqual(list, [groupId], 'excludes subtribes by default')

  list = await p(server.tribes.list)({ subtribes: true })

  t.deepEqual(list, [groupId, subGroupId], '{ subtribes: true } includes subtribes')

  server.close()
  t.end()
})
