const test = require('tape')
const keys = require('ssb-keys')
const { promisify: p } = require('util')
const { Server, GroupId } = require('../../helpers')

// const sleep = async (t) => new Promise(resolve => setTimeout(resolve, t))

test('tribes.application.create', async t => {
  const server = Server()
  const adminIds = [keys.generate().id]
  const groupId = GroupId()
  const answers = [
    { q: 'what is your favourate pizza flavour', a: 'hawaiian' }
  ]

  const id = await p(server.tribes.application.create)(groupId, adminIds, { answers })
  const val = await p(server.get)({ id, private: true })
  t.deepEqual(
    val.content,
    {
      type: 'group/application',
      groupId,
      version: 'v2',
      answers: { set: answers },
      recps: [...adminIds, server.id],
      tangles: {
        application: { root: null, previous: null }
      }
    },
    'publishes correct message'
  )

  server.close()
  t.end()
})
