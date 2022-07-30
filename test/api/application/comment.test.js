const test = require('tape')
const { promisify: p } = require('util')
const { Server, GroupId } = require('../../helpers')
const keys = require('ssb-keys')

test('tribes.application.comment', async t => {
  const alice = Server({ application: true })

  const adminIds = [keys.generate().id]
  const groupId = GroupId()

  let id, comment, val
  try {
    id = await p(alice.tribes.application.create)(groupId, adminIds)

    comment = 'oh btw my birth name is john'
    const updateId = await p(alice.tribes.application.update)(id, { comment })

    val = await p(alice.get)({ id: updateId, private: true })
  } catch (err) {
    t.fail(err)
  }
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
