const test = require('tape')
const isCloaked = require('../../lib/is-cloaked-msg-id')


test('is-cloaked-msg-id', t => {
  const a = `%RbzGUXS4jiZHToZN9xPHBRAOs08VZjLgfyoz1KklmvQ=.cloaked`
  t.true(isCloaked(a), 'correct positive!')

  const b = `%RbzGUXS4jiZHToZN9xPHBRAOs08VZjLgfyoz1KklmvQ=.sha256`
  t.false(isCloaked(b), 'correct negative')

  const c = `%RbzGUXS4jiZHToZN9xPHBRAOs08VZjLgfyoz1Kklmv=.cloaked`
  t.false(isCloaked(c), 'correct negative (too short)')

  const d = `%RbzGUXS4jiZHToZN9xPHBRAOs08VZjLgfyoz1KklmvQ=+cloaked`
  t.false(isCloaked(d), 'correct negative')
  t.end()
})
