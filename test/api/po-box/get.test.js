const test = require('tape')
const { promisify: p } = require('util')

const { Server } = require('../../helpers')

test('tribes.poBox.get', async t => {
  const server = Server({ debug: !true })

  let group

  group = await p(server.tribes.create)({ addPOBox: true }).catch(err => {
    console.error('failed creating tribe with pobox:', err)
    t.fail(err)
  })
  const keys = await p(server.tribes.poBox.get)(group.groupId)
  t.equal(keys.poBoxId, group.poBoxId, 'fetch poBoxId by groupId')

  /* when we're not part of the group */
  const randomGroupId = '%xZB3uze27TcaUKCj7EY6qIB1H1Kp8ASpCKI4gjIB/EE=.cloaked'
  await new Promise(resolve => {
    server.tribes.poBox.get(randomGroupId, (err, data) => {
      t.match(err.message, /unknown groupId/, 'correct error for unknown group')
      t.equal(data, undefined, 'no data returned')

      resolve()
    })
  })

  /* when the gorup has no poBox */
  group = await p(server.tribes.create)({ addPOBox: false })
  await p(server.tribes.poBox.get)(group.groupId)
    .then((result) => t.fail('there should have been an error'))
    .catch(err => t.match(err.message, /no poBox found/, 'error when there is no poBox found'))

  server.close()
  t.end()
})
