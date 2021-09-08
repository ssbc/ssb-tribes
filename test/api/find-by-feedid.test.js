const test = require('tape')
const pull = require('pull-stream')

const { Server } = require('../helpers')

function setup (linkDetails, next) {
  const server = Server()

  pull(
    pull.values(linkDetails),
    pull.asyncMap(createGroupAndLink),
    pull.collect((err, data) => {
      if (err) throw err
      next({ server, data })
    })
  )

  function createGroupAndLink ({ name }, cb) {
    server.tribes.create({}, (err, data) => {
      if (err) return cb(err)
      const { groupId } = data

      server.tribes.link.create({ group: groupId, name }, (err, link) => {
        if (err) return cb(err)
        server.get({ id: link.key, private: true, meta: true }, (_, link) => {
          cb(null, { groupId, link })
        })
      })
    })
  }
}

test('findByFeedId', t => {
  t.plan(2)

  /* finds all profiles */
  const linkDetails = [
    {},
    { name: 'personal' }
  ]

  setup(linkDetails, ({ server, data }) => {
    server.tribes.findByFeedId(server.id, (err, tribes) => {
      if (err) throw err

      const expected = data.map(d => {
        const { name } = d.link.value.content
        return {
          groupId: d.groupId,
          recps: [d.groupId],
          states: [{
            head: d.link.key,
            state: {
              name: (name && name.set) || null
            }
          }]
        }
      })

      t.deepEqual(tribes, expected, 'finds all my tribes with name')
      server.close()
    })
  })

  // finds no profile
  setup([], ({ server, links }) => {
    server.tribes.findByFeedId(server.id, (_, tribes) => {
      t.deepEqual(tribes, [], 'returns empty array of tribes')

      server.close()
    })
  })
})
