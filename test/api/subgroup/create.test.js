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

      const { subgroupId, groupKey: subgroupKey, poBoxId, groupInitMsg } = data

      t.true(isGroup(subgroupId), 'subgroupId')
      t.true(Buffer.isBuffer(subgroupKey) && subgroupKey.length === 32, 'subgroupKey')
      t.true(isPoBox(poBoxId), 'data.poBoxId')

      getLink((err, link) => {
        if (err) throw err

        const { parent, child, recps } = link.value.content

        t.equal(parent, groupId, 'link/group-subgroup parent')
        t.equal(child, subgroupId, 'link/group-subgroup child')
        t.deepEqual(recps, [groupId], 'link/group-subgroup recps')

        server.tribes.get(subgroupId, (err, group) => {
          t.error(err, 'get subgroup')

          t.deepEqual(
            group,
            {
              key: subgroupKey,
              root: groupInitMsg.key,
              scheme: 'envelope-large-symmetric-group',
              subgroupId,
              groupId
            },
            'returns subgroup with parentGroupId'
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
            type: 'link/group-subgroup'
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
