const test = require('tape')
const { promisify: p } = require('util')
const { Server, replicate } = require('../helpers')

test('addNewAuthorListener', t => {
  t.plan(6)

  const admin = Server({ name: 'admin', debug: false }) // me
  const newPerson = Server({ name: 'newPerson', debug: false }) // some friend

  const name = id => {
    if (id === admin.id) return 'admin'
    if (id === newPerson.id) return 'newPerson'
  }

  let groupId // eslint-disable-line

  let numAdded = 0
  admin.tribes.addNewAuthorListener(({ newAuthors, groupId: _groupId }) => {
    // should hear adding self to newly created group
    if (numAdded < 1) {
      t.deepEqual(newAuthors.map(name), ['admin'], 'admin = returns expected newAuthors')
    } else if (numAdded === 1) {
      t.deepEqual(newAuthors.map(name), ['newPerson'], 'admin sees newMember being added')
    }
    numAdded++

    const testGroupId = () => {
      if (!groupId) return setTimeout(testGroupId, 50)
      t.equal(_groupId, groupId, 'admin = returns expected groupId')
    }
    testGroupId()
  })

  newPerson.tribes.addNewAuthorListener(({ newAuthors, groupId: _groupId }) => {
    // being added to the new group, this person immediately discovers themself + their inviter in group
    t.deepEqual(newAuthors.map(name), ['admin', 'newPerson'], 'newPerson returns expected newAuthors')
    t.equal(_groupId, groupId, 'newPerson, returns expected groupId')

    setTimeout(() => {
      admin.close()
      newPerson.close()
    }, 1000)
  })

  // this makes a group, but also in the background, alerts the newAuthorListeners
  // so the above listener can get called *before* we have access to the groupId
  p(admin.tribes.create)({}).then((groupData) => {
    groupId = groupData.groupId
    return p(admin.tribes.invite)(groupId, [newPerson.id], { text: 'ahoy' })
  }).then(() => {
    return p(admin.tribes.invite)(groupId, [newPerson.id], { text: 'ahoy again' })
  }).then(() => {
    // we want to test that duplicate adds dont fire the addNewAuthorListener multiple times,
    // unfortunately there are race conditions around calculating the new authors, so
    // we have added a small delay here
    // later note: no we haven't?

    return p(replicate)({ from: admin, to: newPerson, name })
  }).catch((err) => {
    t.fail(err)
  })
})
