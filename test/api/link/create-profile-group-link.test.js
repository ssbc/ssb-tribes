const test = require('tape')
const { Server } = require('../../helpers')

function run (next) {
  const server = Server()

  next({ server })
}

test('link/feed-group (create)', t => {
  // /////////
  t.plan(5)
  // /////////

  // linking to a valid tribe
  run(({ server }) => {
    server.tribes.create({}, (_, tribe) => {
      server.tribes.link.create({ group: tribe.groupId }, (err, link) => {
        t.error(err, 'creates link')

        server.get({ id: link.key, private: true, meta: true }, (_, link) => {
          const { parent: _feedId, child: _groupId, recps } = link.value.content
          t.equal(_feedId, server.id, 'encodes current feedId')
          t.equal(_groupId, tribe.groupId, 'encodes the groupId')
          t.deepEqual(recps, [tribe.groupId], 'encrypts to the group')

          server.close()
        })
      })
    })
  })

  // trying to link to some junk
  run(({ server }) => {
    server.tribes.link.create({ group: '%cat.cloaked' }, (err) => {
      t.match(err.message, /data.child referenced schema does not match/, 'errors when linking to some non-groupId')

      server.close()
    })
  })
})
