const test = require('tape')
const { isCloakedMsg: isGroup } = require('ssb-ref')
const isPoBox = require('ssb-private-group-keys/lib/is-po-box') // TODO find better home
const pull = require('pull-stream')

const { Server } = require('../../helpers')

test('tribes.subtribe.create', t => {
  const server = Server()

  // this is more of an integration test over the api
  server.tribes.create(null, (err, data) => {
    t.error(err, 'create tribe')

    const { groupId, groupKey } = data
    t.true(isGroup(groupId), 'returns group identifier - groupId')
    t.true(Buffer.isBuffer(groupKey) && groupKey.length === 32, 'returns group symmetric key - groupKey')

    server.tribes.subtribe.create(groupId, null, (err, data) => {
      t.error(err, 'create subtribe')

      const { subGroupId, groupKey: subGroupKey, poBoxId, groupInitMsg } = data

      t.true(isGroup(subGroupId), 'subGroupId')
      t.true(Buffer.isBuffer(subGroupKey) && subGroupKey.length === 32, 'subGroupKey')
      t.true(isPoBox(poBoxId), 'data.poBoxId')

      getLink((err, link) => {
        if (err) throw err

        const { parent, child, recps } = link.value.content

        t.equal(parent, groupId, 'link/group-subGroup parent')
        t.equal(child, subGroupId, 'link/group-subGroup child')
        t.deepEqual(recps, [groupId], 'link/group-subGroup recps')

        server.tribes.get(subGroupId, (err, group) => {
          t.error(err, 'get subGroup')

          t.deepEqual(
            group,
            {
              key: subGroupKey,
              root: groupInitMsg.key,
              scheme: 'envelope-large-symmetric-group',
              subGroupId,
              groupId
            },
            'returns subGroup with parentGroupId'
          )

          server.close()
          t.end()
        })
      })
    })
  })

  function getLink (cb) {
    const query = [{
      $filter: {
        value: {
          content: {
            type: 'link/group-subGroup'
          }
        }
      }
    }]

    pull(
      server.query.read({ query }),
      pull.collect((err, msgs) => err ? cb(err) : cb(null, msgs[0]))
    )
  }
})
