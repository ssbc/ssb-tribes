const test = require('tape')
const { promisify: p } = require('util')
const { Server, replicate } = require('../../helpers')
const { setTimeout } = require('timers')

test('addNewAuthorListener', async t => {
  t.plan(4)

  const admin = Server() // me
  const newPerson = Server() // some friend

  const name = id => {
    if (id === admin.id) return 'admin'
    if (id === newPerson.id) return 'newPerson'
  }

  var groupId

  admin.tribes.addNewAuthorListener(({ newAuthors, groupId: _groupId }) => {
    t.deepEqual(newAuthors.map(name), ['admin'], 'admin = returns expected newAuthors')
    setTimeout(() => t.equal(_groupId, groupId, 'admin = returns expected groupId'), 500)
  })

  var groupData = await p(admin.tribes.create)({})
  groupId = groupData.groupId
  await p(admin.tribes.invite)(groupId, [newPerson.id], { text: 'ahoy' })

  setTimeout(async () => {
    await p(admin.tribes.invite)(groupId, [newPerson.id], { text: 'ahoy' })
  }, 500)
  // we want to test that duplicate adds dont fire the addNewAuthorListener multiple times,
  // unfortunately there are race conditions around calculating the new authors, so
  // we have added a small delay here

  newPerson.tribes.addNewAuthorListener(({ newAuthors, groupId: _groupId }) => {
    t.deepEqual(newAuthors.map(name), ['admin', 'newPerson'], 'returns expected newAuthors')
    t.equal(_groupId, groupId, 'returns expected groupId')

    setTimeout(() => {
      admin.close()
      newPerson.close()
    }, 500)
    // servers dont like being closed while rebuilding?
  })

  replicate({ from: admin, to: newPerson, live: true, name })
})
