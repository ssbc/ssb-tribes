const test = require('tape')
const { isCloakedMsg: isGroup } = require('ssb-ref')
const isPoBox = require('ssb-private-group-keys/lib/is-po-box') // TODO find better home

const { Server } = require('../helpers')

test('tribes.create', t => {
  const server = Server()

  // this is more of an integration test over the api
  server.tribes.create({}, (err, data) => {
    if (err) throw err

    const { groupId, groupKey, groupInitMsg } = data
    t.true(isGroup(groupId), 'returns group identifier - groupId')
    t.true(Buffer.isBuffer(groupKey) && groupKey.length === 32, 'returns group symmetric key - groupKey')
    t.match(groupInitMsg.value.content, /^[a-zA-Z0-9/+]+=*\.box2$/, 'encrypted init msg')

    server.get({ id: groupInitMsg.key, private: true }, (err, value) => {
      if (err) throw err

      t.deepEqual(
        value.content,
        {
          type: 'group/init',
          tangles: {
            group: { root: null, previous: null }
          }
        },
        'can decrypt group/init'
      )

      server.close()
      t.end()
    })
  })
})

test('tribes.create (opts.addPOBox)', t => {
  const server = Server()

  // this is more of an integration test over the api
  server.tribes.create({ addPOBox: true }, (err, data) => {
    if (err) throw err

    t.true(isPoBox(data.poBoxId), 'data.poBoxId')

    server.close()
    t.end()
  })
})
