const test = require('tape')
const keys = require('ssb-keys')
const { promisify: p } = require('util')
const { Server, GroupId } = require('../../helpers')

// const sleep = async (t) => new Promise(resolve => setTimeout(resolve, t))
test('tribes.application.create (v2.1 application)', async t => {
  const server = Server({ application: true })
  const adminIds = [keys.generate().id]
  const groupId = GroupId()
  const answers = [
    { q: 'what is your favourate pizza flavour', a: 'hawaiian' }
  ]

  const profileId = '%FiR41bB1CrsanZA3VgAzoMmHEOl8ZNXWn+GS5vW3E/8=.sha256'

  let id, val
  try {
    id = await p(server.tribes.application.create)(groupId, adminIds, { answers, profileId })
    val = await p(server.get)({ id, private: true })
  } catch (err) {
    t.fail(err)
  }
  t.deepEqual(
    val.content,
    {
      type: 'group/application',
      groupId,
      version: 'v2.1',
      answers: { set: answers },
      recps: [...adminIds, server.id],
      profileId,
      tangles: {
        application: { root: null, previous: null }
      }
    },
    'publishes correct message'
  )

  server.close()
  t.end()
})
