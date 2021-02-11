const test = require('tape')
const { promisify: p } = require('util')
const pull = require('pull-stream')
const { Server, replicate } = require('../../helpers')

test('tribes.application.accept', async t => {
  const kaitiaki = Server()
  const alice = Server()

  const { groupId } = await p(kaitiaki.tribes.create)({})

  const adminIds = [kaitiaki.id]
  const answers = [
    { q: 'what is your favourate pizza flavour', a: 'hawaiian' }
  ]

  const id = await p(alice.tribes.application.create)(groupId, adminIds, { answers })
  await p(replicate)({ from: alice, to: kaitiaki })

  const applicationComment = 'So good you made it!'
  const groupIntro = 'Everyone I would like you to welcome John'
  await p(kaitiaki.tribes.application.accept)(id, { applicationComment, groupIntro })

  pull(
    kaitiaki.createUserStream({ id: kaitiaki.id, reverse: true, private: true }),
    pull.take(2),
    pull.collect((err, msgs) => {
      if (err) throw err

      const [acceptMsg, groupAddMsg] = msgs

      t.equal(groupAddMsg.value.content.type, 'group/add-member', 'publishes a group/add-member msg')
      t.equal(groupAddMsg.value.content.text, groupIntro, 'groupText is published with group/add-member msg')

      t.deepEqual(
        acceptMsg.value.content,
        {
          type: 'group/application',
          comment: { set: applicationComment },
          decision: {
            set: {
              approved: true,
              addMember: groupAddMsg.key
            }
          },
          recps: [...adminIds, alice.id],
          tangles: {
            application: { root: id, previous: [id] }
          }
        },
        'accept message is sent!'
      )

      alice.close()
      kaitiaki.close()
      t.end()
    })
  )
})
