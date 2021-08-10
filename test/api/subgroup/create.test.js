const test = require('tape')
const { Server } = require('../../helpers')
const { isCloakedMsg: isGroup } = require('ssb-ref')

test('tribes.subtribe.create', t => {
  t.plan(6)
  const server = Server()

  // this is more of an integration test over the api
  server.tribes.create(null, (err, data) => {
    t.error(err, 'create tribe')

    const { groupId, groupKey } = data
    t.true(isGroup(groupId), 'returns group identifier - groupId')
    t.true(Buffer.isBuffer(groupKey) && groupKey.length === 32, 'returns group symmetric key - groupKey')

    server.tribes.subtribe.create(groupId, null, (err, data) => {
      t.error(err, 'create subtribe')

      const { groupId: subgroupId, groupKey: subgroupKey } = data

      t.true(isGroup(subgroupId), 'returns subgroup identifier - groupId')
      t.true(Buffer.isBuffer(subgroupKey) && subgroupKey.length === 32, 'returns subgroup symmetric key - groupKey')

      // t.fail('TODO: update test for dmKey')

      server.close()
    })
  })
})
