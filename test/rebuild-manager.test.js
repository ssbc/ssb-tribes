const test = require('tape')
const pull = require('pull-stream')
const Manager = require('../rebuild-manager')

const { Server } = require('./helpers')

test('rebuild-manager', t => {
  const ssb = Server()

  const manager = new Manager(ssb)

  let count = 0
  // for test we fake-slow down the rebuild callback
  ssb.rebuild.hook((rebuild, [cb]) => {
    count++
    rebuild((err) => {
      console.log('rebuild done, waiting a moment...')
      setTimeout(() => cb(err), 100)
    })
  })

  manager.rebuild()
  manager.rebuild()
  manager.rebuild()

  t.equal(count, 1, 'db rebuild only get called once')

  ssb.close()
  t.end()
})
