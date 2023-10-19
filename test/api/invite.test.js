const pull = require('pull-stream')
const { where, author, toPromise, descending } = require('ssb-db2/operators')
const { test, p, Run, Server, replicate, FeedId } = require('../helpers')

test('tribes.invite', async t => {
  const run = Run(t)
  const kaitiaki = Server({ name: 'kaitiaki' })
  const newPerson = Server({ name: 'new-person', debug: !true })

  const { groupId, groupKey, groupInitMsg } = await p(kaitiaki.tribes.create)({}).catch(err => {
    console.error(err)
    t.fail(err)
  })
  t.true(groupId, 'creates group')

  const selfAdd = (await pull(
    kaitiaki.db.query(
      where(author(kaitiaki.id)),
      descending(),
      toPromise()
    )
  ))[0]

  t.true(selfAdd, 'got addition of self')

  const authorIds = [
    newPerson.id,
    FeedId()
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
      group: { root: groupInitMsg.key, previous: [selfAdd.key] },
      members: { root: groupInitMsg.key, previous: [selfAdd.key] }
    }
  }
  t.deepEqual(invite.content, expected, 'kaitiaki sent invite')

  /* kaitiaki posts to group, new person can read */
  const greetingContent = {
    type: 'post',
    text: 'Welcome new person!',
    recps: [groupId]
  }
  const { key: greetingKey } = await run(
    'kaitiaki published message',
    p(kaitiaki.tribes.publish)(greetingContent)
  )

  await run(
    'replicated',
    p(replicate)({ from: kaitiaki, to: newPerson, live: false })
  )
  await p(setTimeout)(500)

  const greetingMsg = await run(
    'new-person can get message',
    Getter(newPerson)(greetingKey)
  )
  t.deepEqual(greetingMsg.value.content, greetingContent, 'new person can read group content')

  /* new person posts to group, kaitiaki can read */
  const replyContent = {
    type: 'post',
    text: 'Thank you kaitiaki',
    recps: [groupId]
  }
  const { key: replyKey } = await p(newPerson.tribes.publish)(replyContent)
  await p(replicate)({ from: newPerson, to: kaitiaki, live: false })
  const replyMsg = await Getter(kaitiaki)(replyKey)
  t.deepEqual(replyMsg.value.content, replyContent, 'kaitiaki can read things from new person')

  kaitiaki.close()
  newPerson.close()
  t.end()
})

function Getter (ssb) {
  let attempts = 0

  return function get (id, cb) {
    if (cb === undefined) return p(get)(id)

    attempts++
    ssb.get({ id, private: true, meta: true }, (err, m) => {
      if (err) return cb(err)
      // if content is encrypted,
      // and haven't tried too many times,
      if (typeof m.value.content === 'string' && attempts < 5) {
        // try again (in case indexing has finished in a moment)
        return setTimeout(() => get(id, cb), 500)
      }
      cb(null, m)
    })
  }
}
