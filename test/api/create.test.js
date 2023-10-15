const test = require('tape')
const { isCloakedMsg: isGroup } = require('ssb-ref')
const isPoBox = require('ssb-private-group-keys/lib/is-po-box') // TODO find better home
const pull = require('pull-stream')
const { where, and, author, isDecrypted, toPullStream, descending } = require('ssb-db2/operators')

const { Server } = require('../helpers')

test('tribes.create', t => {
  const server = Server()

  // this is more of an integration test over the api
  server.tribes.create({}, (err, data) => {
    if (err) throw err

    const { groupId, groupKey, groupInitMsg } = data
    t.true(isGroup(groupId), 'returns group identifier - groupId')
    t.true(Buffer.isBuffer(groupKey) && groupKey.length === 32, 'returns group symmetric key - groupKey')
    t.match(groupInitMsg.meta.originalContent, /^[a-zA-Z0-9/+]+=*\.box2$/, 'encrypted init msg')

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

      // check I published a group/add-member to myself
      pull(
        server.db.query(
          where(
            and(
              isDecrypted('box2'),
              author(server.id)
            )
          ),
          descending(),
          toPullStream()
        ),
        pull.map(msg => msg.value.content),
        pull.collect((err, msgContents) => {
          if (err) throw err

          t.deepEqual(
            msgContents[0], // contents of the latest message
            {
              type: 'group/add-member',
              version: 'v1',
              groupKey: groupKey.toString('base64'),
              root: groupInitMsg.key,
              recps: [groupId, server.id], // me being added to the group
              tangles: {
                members: {
                  root: groupInitMsg.key,
                  previous: [groupInitMsg.key]
                },
                group: {
                  root: groupInitMsg.key,
                  previous: [groupInitMsg.key]
                }
              }
            },
            'The admin was was also added to the group'
          )
          server.close()
          t.end()
        })
      )
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
