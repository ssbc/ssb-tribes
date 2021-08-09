const test = require('tape')
const { isValid } = require('../../../../spec/group/add-member')
const { GroupId, FeedId } = require('../../../helpers')

const Mock = (overwrite = {}) => {
  const base = {
    type: 'group/add-member',
    version: 'v1',
    groupKey: '3YUat1ylIUVGaCjotAvof09DhyFxE8iGbF6QxLlCWWc=',
    root: '%THxjTGPuXvvxnbnAV7xVuVXdhDcmoNtDDN0j3UTxcd8=.sha256',
    text: 'welcome keks!', // optional
    recps: [
      GroupId()
      // add 15 feedId
    ],

    tangles: {
      group: {
        root: '%THxjTGPuXvvxnbnAV7xVuVXdhDcmoNtDDN0j3UTxcd8=.sha256',
        previous: [
          '%Sp294oBk7OJxizvPOlm6Sqk3fFJA2EQFiyJ1MS/BZ9E=.sha256'
        ]
      },
      members: {
        root: '%THxjTGPuXvvxnbnAV7xVuVXdhDcmoNtDDN0j3UTxcd8=.sha256',
        previous: [
          '%lm6Sqk3fFJA2EQFiyJ1MSASDASDASDASDASDAS/BZ9E=.sha256',
          '%Sp294oBk7OJxizvPOlm6Sqk3fFJA2EQFiyJ1MS/BZ9E=.sha256'
        ]
      }
    }
  }
  times(15, () => base.recps.push(FeedId()))

  return Object.assign(base, overwrite)
}

function times (n, fn) {
  for (let i = 0; i < n; i++) {
    fn(i)
  }
}

test('is-group-add-member', t => {
  const full = Mock()
  t.true(isValid(full), 'fully featured')
  if (isValid.errors) throw isValid.errorsString

  const min = Mock()
  delete min.text
  t.true(isValid(min), 'minimal')
  if (isValid.errors) throw isValid.errorsString

  /* recps */
  const dms = Mock({ recps: [FeedId(), FeedId()] })
  t.false(isValid(dms), 'must have a group')

  const junkRecps = Mock({ recps: [GroupId(), 'cat'] })
  t.false(isValid(junkRecps), 'fails invalid recps')

  const tooManyGroups = Mock({ recps: [GroupId(), GroupId(), FeedId()] })
  t.false(isValid(tooManyGroups), 'fails if more than one group')

  const groupInWrongSlot = Mock({ recps: [FeedId(), GroupId()] })
  t.false(isValid(groupInWrongSlot), 'fails if group not in first slot')

  const noAdditions = Mock({ recps: [GroupId()] })
  t.false(isValid(noAdditions), 'fails if no recps other than group')

  const recps = [GroupId()]
  times(16, () => recps.push(FeedId()))
  const tooManyRecps = Mock({ recps })
  t.false(isValid(tooManyRecps), 'fails if > 16 recps')

  // TODO // test more edge cases

  /* not sure how to code this in v4 draft compatible JSON schema */
  const noGroupRecps = Mock({
    recps: [
      '@zXUllRkNYXkE3TikkY4GFMX3lTbj5E+604AkaO1xbz8=.ed25519',
      '@YXkE3TikkY4GFMX3lzXUllRkNTbj5E+604AkaO1xbz8=.ed25519'
    ]
  })
  t.false(isValid(noGroupRecps), 'fails if there is no group recp')

  t.end()
})
