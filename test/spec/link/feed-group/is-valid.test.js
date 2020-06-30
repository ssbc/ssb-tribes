const test = require('tape')
const { isValid } = require('../../../../spec/link/feed-group')
const { GroupId } = require('../../../helpers')
const { FeedId: FI } = require('../../../../lib/cipherlinks')

const FeedId = () => new FI().mock().toSSB()

const Mock = (overwrite = {}) => {
  const base = {
    type: 'link/feed-group',
    parent: FeedId(),
    child: GroupId(),
    name: { set: 'personal' },
    recps: [
      GroupId()
    ],

    tangles: {
      link: { root: null, previous: null }
    }
  }

  return Object.assign(base, overwrite)
}

test('is-valid-feed-group-link', t => {
  t.true(isValid(Mock()), 'complete message valid')

  /* minimal */
  const minimal = Mock()
  delete minimal.name
  t.true(isValid(minimal), 'minimal message valid')

  /* type */
  t.false(isValid(Mock({ type: 'link.feed-group' })), 'incorrect type invalid')
  t.false(isValid(Mock({ type: 'linkfeed-group' })), 'incorrect type invalid')

  /* name */
  t.false(isValid(Mock({ name: 'scritch scratch' })), 'incorrect name invalid')
  t.false(isValid(Mock({ name: { set: 4 } })), 'incorrect name invalid')

  /* parent */

  /* child */

  /* recps */
  t.false(isValid(Mock({ recps: null })), 'missing recps invalid')
  t.false(isValid(Mock({ recps: [] })), 'missing recps invalid')
  const missingRecps = Mock()
  delete missingRecps.recps
  t.false(isValid(missingRecps), 'missing recps invalid')
  t.false(isValid(Mock({ recps: [GroupId(), GroupId()] })), 'too many recps invalid')
  t.false(isValid(Mock({ recps: [FeedId()] })), 'wrong recps invalid')

  /* junk */
  t.false(isValid(Mock({ junk: 'doof' })), 'junk props invalid')

  t.end()
})
