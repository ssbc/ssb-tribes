const test = require('tape')
const pull = require('pull-stream')
const isPoBox = require('ssb-private-group-keys/lib/is-po-box') // TODO find better home
const { where, and, author, isDecrypted, descending, toPullStream } = require('ssb-db2/operators')

const { Server } = require('../helpers')

test('tribes.addPOBox', t => {
  const server = Server()

  server.tribes.create({}, (err, data) => {
    if (err) throw err

    const { groupId } = data

    server.tribes.addPOBox(groupId, (err, poBoxId) => {
      if (err) throw err
      t.true(isPoBox(poBoxId), 'adding P.O. Box to group returns poBoxId')

      pull(
        server.db.query(
          where(and(
            author(server.id),
            isDecrypted('box2')
          )),
          descending(),
          toPullStream()
        ),
        pull.take(1),
        pull.drain(m => {
          const { type, recps, keys } = m.value.content
          t.equal(type, 'group/po-box', 'po-box type msg')
          t.deepEqual(recps, [groupId], 'published to group')
          t.equal(keys.set.poBoxId, poBoxId, 'has poBoxId')
          t.ok(keys.set.key, 'has secret')

          server.close()
          t.end()
        }, err => {
          if (err) t.fail(err)
        })
      )
    })
  })
})
