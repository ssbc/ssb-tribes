const test = require('tape')
const { promisify: p } = require('util')
const { Server, replicate, FeedId } = require('../helpers')

test('tribes.excludeMembers', async t => {
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

    let exclude = await p(kaitiaki.tribes.excludeMembers)(groupId, authorIds).catch(err => t.error(err, err.message))

    exclude = await p(kaitiaki.get)({ id: exclude.key, private: true })
    const expected = {
      type: 'group/exclude-member',
      excludes: authorIds,

      tangles: {
        members: { root: groupInitMsg.key, previous: [groupInitMsg.key] },
        group: { root: groupInitMsg.key, previous: [...exclude.content.tangles.group.previous] }
      },
      recps: [groupId]
    }
    t.deepEqual(exclude.content, expected, 'kaitiaki excluded everyone')

    const authors = await p(kaitiaki.tribes.listAuthors)(groupId)
    console.log('authors', authors)
    t.deepEqual(authors, [kaitiaki.id], "kaitiaki removed the others from the group")
  } catch (err) {
    t.fail(err)
  }

  await p(setTimeout)(500)

  await Promise.all([
    p(kaitiaki.close)(true),
    p(newPerson.close)(true)
  ])
    .then(() => t.pass('clients close'))
    .catch((err) => t.error(err))

  t.end()
})
