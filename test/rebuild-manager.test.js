const test = require('tape')
const { promisify: p } = require('util')
const Server = require('scuttle-testbot')
// NOTE we do not use the helpers/test-bot as that has a RebuildManager installed with ssb-tribes!

const Manager = require('../rebuild-manager')

async function setup () {
  const ssb = Server({
    db1: true
  })
  // ssb.post(console.log)

  // NOTE - We cannot rebuild an empty DB ?!
  await p(ssb.publish)({ type: 'filler', text: new Array(1000).fill('dog').join() })
  await p(ssb.publish)({ type: 'filler', text: new Array(1000).fill('cat').join() })

  // we fake indexing taking some time to be done
  const TIME_TILL_INDEX_DONE = 1000
  setTimeout(() => { ssb._isIndexingDone = true }, TIME_TILL_INDEX_DONE)

  ssb.status.hook(status => {
    const current = status()
    if (ssb._isIndexingDone) return current

    // current.sync.plugins.links = 5000
    current.sync.sync = false
    return current
  })

  return ssb
}

test('rebuild-manager', t => {
  t.plan(3)
  setup().then(ssb => {
  // we wrap ssb.rebuild once to know exactly what goes through to the db
    // we expect only one call to come through from the rebuildManager
    // AFTER indexing is complete
    let rebuildCount = 0
    ssb.rebuild.hook((rebuild, [cb]) => {
      t.true(ssb.status().sync.sync, 'rebuild only gets called once indexing is done')
      rebuildCount++
      rebuild(cb)
    })

    // this wraps ssb.rebuild again
    const manager = new Manager(ssb)

    manager.rebuild('my dog')
    manager.rebuild('my cat', () => t.pass('callback in the middle'))
    manager.rebuild('my fish', () => {
      t.equal(rebuildCount, 1, 'db rebuild only gets called once')

      ssb.close()
    })
  })
})

test('rebuild-manager (rebuild called during rebuild with EXISTING reason)', t => {
  t.plan(4)
  setup().then(ssb => {
    let rebuildCount = 0
    ssb.rebuild.hook((rebuild, [cb]) => {
      t.true(ssb.status().sync.sync, 'rebuild only gets called once indexing is done')
      rebuildCount++
      rebuild.call(ssb, cb)
      manager.rebuild('my cat', () => { // << 'my cat' already cited as EXISTING reason for rebuild
        t.equal(rebuildCount, 1, 'existing reason and cb folded into current run')
      })
    })

    const manager = new Manager(ssb)

    manager.rebuild('my fish')
    manager.rebuild('my dog', () => t.pass('callback in the middle'))
    manager.rebuild('my cat', () => {
      t.equal(rebuildCount, 1, 'db rebuild only gets called once')

      ssb.close()
    })
  })
})

test('rebuild-manager (rebuild called during rebuild with NEW reason)', t => {
  t.plan(5)
  setup().then(ssb => {
    let rebuildCount = 0
    ssb.rebuild.hook((rebuild, [cb]) => {
      t.true(ssb.status().sync.sync, 'rebuild only gets called once indexing is done') // see this twice
      rebuildCount++
      rebuild.call(ssb, cb)

      if (rebuildCount === 1) {
        manager.rebuild('my pig', () => { // << 'my pig' is a NEW reason for rebuilding!
          t.equal(rebuildCount, 2, 'rebuild called second time')

          ssb.close()
        })
      }
    })

    const manager = new Manager(ssb)

    manager.rebuild('my fish')
    manager.rebuild('my dog', () => t.pass('callback in the middle'))
    manager.rebuild('my cat', () => {
      t.equal(rebuildCount, 1, 'first rebuild completed')
    })
  })
})
