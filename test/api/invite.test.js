const { test, p, Run, Server, replicate, FeedId } = require('../helpers')

test('tribes.invite', async t => {
  const run = Run(t)
  const kaitiaki = Server({ name: 'kaitiaki' })
  const newPerson = Server({ name: 'new-person', debug: !true })

  const { groupId, groupKey, groupInitMsg } = await p(kaitiaki.tribes.create)({})
  t.true(groupId, 'creates group')

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
  const { key: greetingKey } = await run(
    'kaitiaki published message',
    p(kaitiaki.publish)(greetingContent)
  )

  let numberRebuilds = 0
  const rebuildPromise = new Promise((resolve, reject) => {
    // hook ssb.rebuild - this way we can piggyback the "done" callback of that
    // and know when the get requests "should" work by
    newPerson.rebuild.hook(function (rebuild, args) {
      const [cb] = args
      rebuild.call(this, (err) => {
        numberRebuilds++
        if (typeof cb === 'function') cb(err)
        if (numberRebuilds === 1) resolve()
      })
    })
  })

  await run(
    'replicated',
    p(replicate)({ from: kaitiaki, to: newPerson, live: false })
  )
  await rebuildPromise

  // const pull = require('pull-stream')
  // const msgs = await pull(
  //   newPerson.createLogStream({ private: true }),
  //   pull.map(m => m?.value?.content),
  //   pull.collectAsPromise()
  // )
  // console.log(msgs)

  const greetingMsg = await run(
    'new-person can get message',
    Getter(newPerson)(greetingKey)
  )
  t.deepEqual(greetingMsg?.value?.content, greetingContent, 'new person can read group content')

  /* new person posts to group, kaitiaki can read */
  const replyContent = {
    type: 'post',
    text: 'Thank you kaitiaki',
    recps: [groupId]
  }
  const { key: replyKey } = await p(newPerson.publish)(replyContent)
  await p(replicate)({ from: newPerson, to: kaitiaki, live: false })
  const replyMsg = await Getter(kaitiaki)(replyKey)
  t.deepEqual(replyMsg?.value?.content, replyContent, 'kaitiaki can read things from new person')

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
      if (typeof m.value.content === 'string' && attempts > 5) {
        // try again (in case indexing has finished in a moment)
        return setTimeout(() => get(id, cb), 500)
      }
      cb(null, m)
    })
  }
}
