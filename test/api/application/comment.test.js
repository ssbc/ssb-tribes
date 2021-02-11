const test = require('tape')
const { promisify: p } = require('util')
const { Server, GroupId } = require('../../helpers')
const keys = require('ssb-keys')

test('tribes.application.comment', async t => {
  const alice = Server()

  const adminIds = [keys.generate().id]
  const groupId = GroupId()

  const id = await p(alice.tribes.application.create)(groupId, adminIds, {})

  const comment = 'oh btw my birth name is john'
  const updateId = await p(alice.tribes.application.update)(id, { comment })

  const val = await p(alice.get)({ id: updateId, private: true })
  t.deepEqual(
    val.content,
    {
      type: 'group/application',
      comment: { set: comment },
      recps: [...adminIds, alice.id],
      tangles: {
        application: { root: id, previous: [id] }
      }
    },
    'comment works'
  )

  alice.close()
  t.end()
})
