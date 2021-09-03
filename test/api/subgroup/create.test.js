const test = require('tape')
const { isCloakedMsg: isGroup } = require('ssb-ref')
const isPoBox = require('ssb-private-group-keys/lib/is-po-box') // TODO find better home

const { Server } = require('../../helpers')

test('tribes.subtribe.create', t => {
  t.plan(7)
  const server = Server()

  // this is more of an integration test over the api
  server.tribes.create(null, (err, data) => {
    t.error(err, 'create tribe')

    const { groupId, groupKey } = data
    t.true(isGroup(groupId), 'returns group identifier - groupId')
    t.true(Buffer.isBuffer(groupKey) && groupKey.length === 32, 'returns group symmetric key - groupKey')

    server.tribes.subtribe.create(groupId, null, (err, data) => {
      t.error(err, 'create subtribe')

      const { groupId: subgroupId, groupKey: subgroupKey, poBoxId } = data

      t.true(isGroup(subgroupId), 'subgroupId')
      t.true(Buffer.isBuffer(subgroupKey) && subgroupKey.length === 32, 'subgroupKey')
      t.true(isPoBox(poBoxId), 'data.poBoxId')

      server.close()
    })
  })
})
