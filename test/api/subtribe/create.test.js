const test = require('tape')
const { isCloakedMsg: isGroup } = require('ssb-ref')
const isPoBox = require('ssb-private-group-keys/lib/is-po-box') // TODO find better home
const pull = require('pull-stream')
const { where, type, toPullStream } = require('ssb-db2/operators')

const { Server } = require('../../helpers')

test('tribes.subtribe.create', t => {
  const server = Server()

  // this is more of an integration test over the api
  server.tribes.create({}, (err, data) => {
    t.error(err, 'create tribe')

    const { groupId: parentGroupId, groupKey } = data
    t.true(isGroup(parentGroupId), 'returns group identifier - groupId')
    t.true(Buffer.isBuffer(groupKey) && groupKey.length === 32, 'returns group symmetric key - groupKey')

    server.tribes.subtribe.create(parentGroupId, {}, (err, data) => {
      t.error(err, 'create subtribe')

      const { groupId: subGroupId, groupKey: subGroupKey, poBoxId, parentGroupId, groupInitMsg } = data

      t.true(isGroup(subGroupId), 'data.groupId')
      t.true(isGroup(parentGroupId), 'dada.parentGroupId')
      t.true(Buffer.isBuffer(subGroupKey) && subGroupKey.length === 32, 'data.subGroupKey')
      t.false(isPoBox(poBoxId), 'data.poBoxId')

      getLink((err, link) => {
        if (err) throw err

        const { parent, child, recps } = link.value.content

        t.equal(parent, parentGroupId, 'link/group-group/subgroup parent')
        t.equal(child, subGroupId, 'link/group-group/subgroup child')
        t.deepEqual(recps, [parentGroupId], 'link/group-group/subgroup recps')

        server.tribes.get(subGroupId, (err, group) => {
          t.error(err, 'get subGroup')

          const groupKey = {
            key: subGroupKey,
            scheme: 'envelope-large-symmetric-group'
          }
          t.deepEqual(
            group,
            {
              writeKey: groupKey,
              readKeys: [groupKey],
              root: groupInitMsg.key,
              groupId: subGroupId,
              parentGroupId
            },
            'tribes.get returns subGroup with parentGroupId'
          )

          server.close()
          t.end()
        })
      })
    })
  })

  function getLink (cb) {
    pull(
      server.db.query(
        where(type('link/group-group/subgroup')),
        toPullStream()
      ),
      pull.collect((err, msgs) => err ? cb(err) : cb(null, msgs[0]))
    )
  }
})

test('tribes.subtribe.create (opts.addPOBox)', t => {
  const server = Server()

  // this is more of an integration test over the api
  server.tribes.create({}, (err, data) => {
    t.error(err, 'create tribe')

    const { groupId: parentGroupId, groupKey } = data
    t.true(isGroup(parentGroupId), 'returns group identifier - groupId')
    t.true(Buffer.isBuffer(groupKey) && groupKey.length === 32, 'returns group symmetric key - groupKey')

    server.tribes.subtribe.create(parentGroupId, { addPOBox: true }, (err, data) => {
      if (err) throw err
      const { poBoxId } = data

      t.true(isPoBox(poBoxId), 'data.poBoxId')

      server.close()
      t.end()
    })
  })
})
