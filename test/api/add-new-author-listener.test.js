const test = require('tape')
const { promisify: p } = require('util')
const { setTimeout } = require('timers')
const { Server, replicate } = require('../helpers')

test('addNewAuthorListener', async t => {
  t.plan(4)

  const admin = Server() // me
  const newPerson = Server() // some friend

  const name = id => {
    if (id === admin.id) return 'admin'
    if (id === newPerson.id) return 'newPerson'
  }

  let groupId // eslint-disable-line

  admin.tribes.addNewAuthorListener(({ newAuthors, groupId: _groupId }) => {
    // should hear adding self to newly created group
    t.deepEqual(newAuthors.map(name), ['admin'], 'admin = returns expected newAuthors')
    setTimeout(() => t.equal(_groupId, groupId, 'admin = returns expected groupId'), 500)
  })

  newPerson.tribes.addNewAuthorListener(({ newAuthors, groupId: _groupId }) => {
    // being added to the new group, this person immediately discovers themself + their inviter in group
    t.deepEqual(newAuthors.map(name), ['admin', 'newPerson'], 'returns expected newAuthors')
    t.equal(_groupId, groupId, 'returns expected groupId')

    admin.close()
    newPerson.close()
  })

  try {
    const groupData = await p(admin.tribes.create)({})
    groupId = groupData.groupId
    await p(admin.tribes.invite)(groupId, [newPerson.id], { text: 'ahoy' })

    setTimeout(async () => {
      p(admin.tribes.invite)(groupId, [newPerson.id], { text: 'ahoy' })
    }, 500)
    // we want to test that duplicate adds dont fire the addNewAuthorListener multiple times,
    // unfortunately there are race conditions around calculating the new authors, so
    // we have added a small delay here

    p(replicate)({ from: admin, to: newPerson, name })
  } catch (err) {
    t.fail(err)
  }
})
