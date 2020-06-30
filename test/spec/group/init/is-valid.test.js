const test = require('tape')
const { isValid } = require('../../../../spec/group/init')

const Mock = (overwrite = {}) => {
  const base = {
    type: 'group/init',
    tangles: {
      group: {
        root: null,
        previous: null
      }
    }
  }
  return Object.assign(base, overwrite)
}
test('is-group-init', t => {
  t.true(isValid(Mock()), 'fully featured')

  const min = Mock()
  t.true(isValid(min), 'minimal')

  const noTangle = Mock()
  delete noTangle.tangles
  t.false(isValid(noTangle), 'fails if missing tangles')

  const wrongTangle = Mock()
  delete wrongTangle.tangles.group
  wrongTangle.tangles.members = { root: null, previous: null }
  t.false(isValid(wrongTangle), 'fails if wrong tangle')

  const wrongRoot = Mock()
  wrongRoot.tangles.group.root = '%yap'
  t.false(isValid(wrongRoot), 'fails if wrong tangle.root')

  const wrongPrev = Mock()
  wrongPrev.tangles.group.previous = ['%yip', '%yap']
  t.false(isValid(wrongPrev), 'fails if wrong tangle.previous')

  const extrajunk = Mock({ name: 'doop' })
  t.false(isValid(extrajunk), 'fails if anything is added')
  t.end()
})
