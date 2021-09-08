const test = require('tape')
const { Server } = require('../../helpers')
const { isCloakedMsg: isGroup } = require('ssb-ref')

test('tribes.findBySubgroupId', t => {
  t.plan(10)
  const server = Server()

  // this is more of an integration test over the api
  server.tribes.create(null, (err, data) => {
    t.error(err, 'create tribe')

    const { groupId, groupKey } = data
    t.true(isGroup(groupId), 'returns group identifier - groupId')
    t.true(Buffer.isBuffer(groupKey) && groupKey.length === 32, 'returns group symmetric key - groupKey')

    server.tribes.subtribe.create(groupId, null, (err, data) => {
      t.error(err, 'create subtribe')

      const { subgroupId, groupKey: subgroupKey } = data

      t.true(isGroup(subgroupId), 'returns subgroup identifier - groupId')
      t.true(Buffer.isBuffer(subgroupKey) && subgroupKey.length === 32, 'returns subgroup symmetric key - groupKey')

      t.notEqual(groupId, subgroupId, 'different subgroup,group ids')
      t.notDeepEqual(groupKey, subgroupKey, 'different subgroup,group keys')

      server.tribes.findBySubgroupId(subgroupId, (err, data) => {
        t.error(err, 'finds groups by subgroupId')

        t.deepEqual(
          data,
          [{
            linkId: data[0].linkId,
            groupId,
            subgroupId,
            recps: [groupId],
            states: [{
              head: data[0].linkId, // dont have this
              state: {
              }
            }]
          }],
          'returns matching data'
        )

        server.close()
      })
    })
  })
})
