const test = require('tape')
const { promisify: p } = require('util')
const { Server, replicate, FeedId } = require('../helpers')

test('tribes.excludeMembers',async t => {
  const kaitiaki = Server()
  const newPerson = Server()

  const name = id => {
    if (id === kaitiaki.id) return 'kaitiaki '
    if (id === newPerson.id) return 'new person'
  }

  try {
    const { groupId, groupInitMsg } = await p(kaitiaki.tribes.create)({})
    t.true(groupId, 'creates group')

    const authorIds = [
      newPerson.id,
      FeedId()
    ]

    await p(kaitiaki.tribes.invite)(
      groupId, authorIds, {}
    )

    await p(replicate)({ from: kaitiaki, to: newPerson, live: false, name })

    let exclude = await p(kaitiaki.tribes.excludeMembers)(groupId, authorIds).catch(err=>t.error(err, err.message))

    exclude = await p(kaitiaki.get)({ id: exclude.key, private: true })
    const expected = {
      type: 'group/exclude-member',
      excludes: authorIds,

      tangles: {
        members: { root: groupInitMsg.key, previous: [groupInitMsg.key] },
        group: { root: groupInitMsg.key, previous: [...exclude.content.tangles.group.previous] }
      },
      recps: [groupId],
    }
    t.deepEqual(exclude.content, expected, 'kaitiaki excluded everyone')
  } catch (err) {
    t.fail(err)
  }

  await Promise.all([
    p(kaitiaki.close)(true),
    p(newPerson.close)(true),
  ])
    .then(() => t.pass('clients close'))
    .catch((err) => t.error(err))
})

function Getter (ssb) {
  let attempts = 0

  return function get (id, cb) {
    attempts++
    ssb.get({ id, private: true, meta: true }, (err, m) => {
      if (err) return cb(err)
      if (typeof m.value.content === 'string') {
        if (attempts === 5) throw new Error(`failed to get decrypted msg: ${id}`)

        return setTimeout(() => get(id, cb), 500)
      }
      cb(null, m)
    })
  }
}
