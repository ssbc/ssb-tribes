const test = require('tape')
const { isCloakedMsg: isGroup } = require('ssb-ref')

const { Server } = require('../helpers')

test('tribes.findSubGroupLinks', t => {
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

      const { subGroupId, groupKey: subGroupKey } = data

      t.true(isGroup(subGroupId), 'returns subGroup identifier - groupId')
      t.true(Buffer.isBuffer(subGroupKey) && subGroupKey.length === 32, 'returns subGroup symmetric key - groupKey')

      t.notEqual(groupId, subGroupId, 'different subGroup,group ids')
      t.notDeepEqual(groupKey, subGroupKey, 'different subGroup,group keys')

      server.tribes.findSubGroupLinks(groupId, (err, data) => {
        t.error(err, 'finds subGroup by groupId')

        t.deepEqual(
          data,
          [{
            linkId: data[0].linkId,
            groupId,
            subGroupId,
            recps: [groupId]
          }],
          'returns matching data'
        )

        server.close()
      })
    })
  })
})
