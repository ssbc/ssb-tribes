const test = require('tape')
const keys = require('ssb-keys')
const { promisify: p } = require('util')
const { Server, GroupId } = require('../../helpers')

// const sleep = async (t) => new Promise(resolve => setTimeout(resolve, t))
test('tribes.application.create (v3 application)', async t => {
  const server = Server()
  const adminIds = [keys.generate().id]
  const groupId = GroupId()
  const answers = [
    { q: 'what is your favourate pizza flavour', a: 'hawaiian' }
  ]

  const applicant = {
    preferredName: 'Alice',
    legalName: 'Alice',
    aliveInterval: '1995-07-24/',
    city: 'Faraway',
    country: 'Wonderland'
  }

  let id, val
  try {
    id = await p(server.tribes.application.create)(groupId, adminIds, { answers, applicant })
    val = await p(server.get)({ id, private: true })
  } catch (err) {
    t.fail(err)
  }
  t.deepEqual(
    val.content,
    {
      type: 'group/application',
      groupId,
      version: 'v2',
      answers: { set: answers },
      recps: [...adminIds, server.id],
      applicant: { set: applicant },
      tangles: {
        application: { root: null, previous: null }
      }
    },
    'publishes correct message'
  )

  server.close()
  t.end()
})

test('tribes.application.create (v2 application)', async t => {
  const server = Server()
  const adminIds = [keys.generate().id]
  const groupId = GroupId()
  const answers = [
    { q: 'what is your favourate pizza flavour', a: 'hawaiian' }
  ]

  let id, val
  try {
    id = await p(server.tribes.application.create)(groupId, adminIds, { answers })
    val = await p(server.get)({ id, private: true })
  } catch (err) {
    t.fail(err)
  }
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
