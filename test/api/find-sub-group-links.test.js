const test = require('tape')
const { isCloakedMsg: isGroup } = require('ssb-ref')

const { Server } = require('../helpers')

test('tribes.findSubGroupLinks', t => {
  t.plan(10)
  const server = Server()

  // this is more of an integration test over the api
  server.tribes.create(null, (err, data) => {
    t.error(err, 'create tribe')

    const { groupId: parentGroupId, groupKey } = data
    t.true(isGroup(parentGroupId), 'returns group identifier - groupId')
    t.true(Buffer.isBuffer(groupKey) && groupKey.length === 32, 'returns group symmetric key - groupKey')

    server.tribes.subtribe.create(parentGroupId, { admin: true }, (err, data) => {
      t.error(err, 'create subtribe')

      const { groupId: subGroupId, groupKey: subGroupKey, parentGroupId } = data

      t.true(isGroup(subGroupId), 'returns subGroup identifier - groupId')
      t.true(Buffer.isBuffer(subGroupKey) && subGroupKey.length === 32, 'returns subGroup symmetric key - groupKey')

      t.notEqual(parentGroupId, subGroupId, 'different subGroup,group ids')
      t.notDeepEqual(groupKey, subGroupKey, 'different subGroup,group keys')

      server.tribes.findSubGroupLinks(parentGroupId, (err, data) => {
        t.error(err, 'finds subGroup by groupId')

        t.deepEqual(
          data,
          [{
            linkId: data[0].linkId,
            groupId: parentGroupId,
            subGroupId,
            admin: true,
            recps: [parentGroupId]
          }],
          'returns matching data'
        )

        server.close()
      })
    })
  })
})
