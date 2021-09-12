const test = require('tape')
const { promisify: p } = require('util')
const Manager = require('../rebuild-manager')

const { Server } = require('./helpers')

test('rebuild-manager', async t => {
  t.plan(3)
  const ssb = Server()

  // NOTE - We cannot rebuild an empty DB ?!
  await p(ssb.publish)({ type: 'filler', text: new Array(1000).fill('dog').join() })
  await p(ssb.publish)({ type: 'filler', text: new Array(1000).fill('cat').join() })

  // we fake indexing taking some time to be done
  const TIME_TILL_INDEX_DONE = 1000
  let isIndexingDone = false
  setTimeout(() => { isIndexingDone = true }, TIME_TILL_INDEX_DONE)
  ssb.status.hook(status => {
    const current = status()
    if (isIndexingDone) return current

    // current.sync.plugins.links = 5000
    current.sync.sync = false
    return current
  })

  // we wrap ssb.rebuild once to know exactly what goes through to the db
  // we expect only one call to come through from the rebuildManager
  // AFTER indexing is complete
  let rebuildCound = 0
  ssb.rebuild.hook((rebuild, [cb]) => {
    t.true(isIndexingDone, 'rebuild only get called once indexing is done')

    rebuildCound++
    rebuild.call(ssb, cb)
  })

  // this wraps ssb.rebuild again
  const manager = new Manager(ssb)

  manager.rebuild()
  manager.rebuild(() => t.pass('callback in the middle'))
  manager.rebuild(() => {
    t.equal(rebuildCound, 1, 'db rebuild only gets called once')

    ssb.close()
  })
})
