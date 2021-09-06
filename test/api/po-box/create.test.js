const test = require('tape')
const isPoBox = require('ssb-private-group-keys/lib/is-po-box') // TODO find better home

const { Server } = require('../../helpers')

test('tribes.poBox.create', t => {
  t.plan(2)
  const server = Server()

  server.tribes.poBox.create(null, (err, data) => {
    if (err) throw err

    t.true(isPoBox(data.poBoxId), 'data.poBoxId')
    t.true(Buffer.isBuffer(data.poBoxKey) && data.poBoxKey.length === 32, 'data.poBoxKey')

    server.close()
  })
})
