const test = require('tape')
const { promisify: p } = require('util')
const ssbKeys = require('ssb-keys')
const { Server, replicate, FeedId } = require('../helpers')

test('tribes.excludeMembers', async t => {
  const newPersonKeys = ssbKeys.generate()
  const kaitiaki = Server({ name: 'kaitiaki' })
  const newPerson = Server({ name: 'newPerson', keys: newPersonKeys })

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
    await p(setTimeout)(100)

    const newPersonGotGroup = await p(newPerson.tribes.get)(groupId)
    t.equal(newPersonGotGroup.excluded, undefined, 'new person is not excluded yet')

    let exclude = await p(kaitiaki.tribes.excludeMembers)(groupId, authorIds).catch(err => t.error(err, err.message))

    exclude = await p(kaitiaki.get)({ id: exclude.key, private: true })
    const expected = {
      type: 'group/exclude-member',
      excludes: authorIds,

      tangles: {
        members: { root: groupInitMsg.key, previous: [...exclude.content.tangles.members.previous] },
        group: { root: groupInitMsg.key, previous: [...exclude.content.tangles.group.previous] }
      },
      recps: [groupId]
    }
    t.deepEqual(exclude.content, expected, 'kaitiaki excluded everyone')

    const authors = await p(kaitiaki.tribes.listAuthors)(groupId)
    t.deepEqual(authors, [kaitiaki.id], 'kaitiaki removed the others from the group')

    await p(replicate)({ from: kaitiaki, to: newPerson, live: false, name })

    const newPersonExcludedGroup = await p(newPerson.tribes.get)(groupId)
    t.equal(newPersonExcludedGroup.excluded, true, 'new person is excluded now')

    const excludedList = await p(newPerson.tribes.list)()
    t.deepEqual(excludedList, [], "new person can't list any groups anymore")

    // excluding again to make us use the members tangle to calculate membership
    await p(kaitiaki.tribes.excludeMembers)(groupId, [newPerson.id]).catch(err => t.error(err, err.message))

    await p(kaitiaki.tribes.invite)(
      groupId, [newPerson.id], {}
    )

    const reAddedAuthors = await p(kaitiaki.tribes.listAuthors)(groupId)
    t.deepEqual(reAddedAuthors.sort(), [kaitiaki.id, newPerson.id].sort(), 're-added person is listed as a member')

    await p(replicate)({ from: kaitiaki, to: newPerson, live: false, name })

    const newPersonBackInGroup = await p(newPerson.tribes.get)(groupId)
    t.equal(newPersonBackInGroup.excluded, undefined, 'new person is not excluded anymore')

    await p(setTimeout)(500)

    await Promise.all([
      p(kaitiaki.close)(true),
      p(newPerson.close)(true)
    ])
      .then(() => t.pass('clients close'))
      .catch((err) => t.error(err))

    await p(setTimeout)(500)

    const newPerson2 = Server({ name: 'newPerson',keys: newPersonKeys, startUnclean: true })

    const stillInGroup = await p(newPerson2.tribes.get)(groupId)
    t.equal(stillInGroup.excluded, undefined, 'new person is still not excluded after client restart')

    await p(setTimeout)(500)

    await p(newPerson2.close)(true)
  } catch (err) {
    t.fail(err)
  }
})
