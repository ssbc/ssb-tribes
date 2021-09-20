const test = require('tape')
const { Server } = require('../../helpers')
const { isCloakedMsg: isGroup } = require('ssb-ref')

test('tribes.subtribe.findParentGroupLinks', t => {
  t.plan(10)
  const server = Server()

  // this is more of an integration test over the api
  server.tribes.create(null, (err, data) => {
    t.error(err, 'create tribe')

    const { groupId: parentGroupId, groupKey } = data
    t.true(isGroup(parentGroupId), 'returns group identifier - groupId')
    t.true(Buffer.isBuffer(groupKey) && groupKey.length === 32, 'returns group symmetric key - groupKey')

    server.tribes.subtribe.create(parentGroupId, null, (err, data) => {
      t.error(err, 'create subtribe')

      const { groupId: subGroupId, parentGroupId, groupKey: subGroupKey } = data

      t.true(isGroup(subGroupId), 'returns subGroup identifier - groupId')
      t.true(Buffer.isBuffer(subGroupKey) && subGroupKey.length === 32, 'returns subgroup symmetric key - groupKey')

      t.notEqual(parentGroupId, subGroupId, 'different subGroup,group ids')
      t.notDeepEqual(groupKey, subGroupKey, 'different subGroup,group keys')

      server.tribes.subtribe.findParentGroupLinks(subGroupId, (err, data) => {
        t.error(err, 'finds groups by subGroupId')

        t.deepEqual(
          data,
          [{
            linkId: data[0].linkId,
            groupId: parentGroupId,
            subGroupId,
            admin: null,
            recps: [parentGroupId]
          }],
          'returns matching data'
        )

        server.close()
      })
    })
  })
})
