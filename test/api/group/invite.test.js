const test = require('tape')
const { promisify: p } = require('util')
const { Server, replicate } = require('../../helpers')
const { FeedId } = require('../../../lib/cipherlinks')

test('tribes.invite', async t => {
  const kaitiaki = Server()
  const newPerson = Server()
  const name = id => {
    if (id === kaitiaki.id) return 'kaitiaki '
    if (id === newPerson.id) return 'new person'
  }

  try {
    const { groupId, groupKey, groupInitMsg } = await p(kaitiaki.tribes.create)({})
    t.true(groupId, 'creates group')

    const authorIds = [
      newPerson.id,
      new FeedId().mock().toSSB()
    ]

    let invite = await p(kaitiaki.tribes.invite)(
      groupId, authorIds, { text: 'welcome friends' }
    )

    invite = await p(kaitiaki.get)({ id: invite.key, private: true })
    const expected = {
      type: 'group/add-member',
      version: 'v1',
      groupKey: groupKey.toString('base64'),
      root: groupInitMsg.key,

      text: 'welcome friends',
      recps: [groupId, ...authorIds],

      tangles: {
        group: { root: groupInitMsg.key, previous: [groupInitMsg.key] },
        members: { root: groupInitMsg.key, previous: [groupInitMsg.key] }
      }
    }
    t.deepEqual(invite.content, expected, 'kaitiaki sent invite')

    /* kaitiaki posts to group, new person can read */
    const greetingContent = {
      type: 'post',
      text: 'Welcome new person!',
      recps: [groupId]
    }
    const { key: greetingKey } = await p(kaitiaki.publish)(greetingContent)
    await p(replicate)({ from: kaitiaki, to: newPerson, live: false, name })
    const greetingMsg = await p(Getter(newPerson))(greetingKey)
    t.deepEqual(greetingMsg.value.content, greetingContent, 'new person can read group content')

    /* new person posts to group, kaitiaki can read */
    const replyContent = {
      type: 'post',
      text: 'Thank you kaitiaki',
      recps: [groupId]
    }
    const { key: replyKey } = await p(newPerson.publish)(replyContent)
    await p(replicate)({ from: newPerson, to: kaitiaki, live: false, name })
    const replyMsg = await p(Getter(kaitiaki))(replyKey)
    t.deepEqual(replyMsg.value.content, replyContent, 'kaitiaki can read things from new person')
  } catch (err) {
    t.fail(err)
  }

  kaitiaki.close()
  newPerson.close()
  t.end()
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
