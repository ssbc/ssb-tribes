const test = require('tape')
const isValid = require('../../lib/is-group-add-member')

const Mock = (overwrite = {}) => {
  const base = {
    type: 'group/add-member',
    version: 'v1',
    groupKey: '3YUat1ylIUVGaCjotAvof09DhyFxE8iGbF6QxLlCWWc=',
    initialMsg: '%THxjTGPuXvvxnbnAV7xVuVXdhDcmoNtDDN0j3UTxcd8=.sha256',
    text: 'welcome keks!',                                      // optional
    recps: [
      '%vof09Dhy3YUat1ylIUVGaCjotAFxE8iGbF6QxLlCWWc=.cloaked',  // group_id
      '@YXkE3TikkY4GFMX3lzXUllRkNTbj5E+604AkaO1xbz8=.ed25519'   // feed_id (for new person)
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
  return Object.assign(base, overwrite)
}

test('is-group-add-member', t => {
  t.true(isValid(Mock()), 'fully featured')

  const min = Mock()
  delete min.text
  t.true(isValid(min), 'minimal')

  const tooFewRecps = Mock()
  delete tooFewRecps.recps.pop()
  t.false(isValid(tooFewRecps), 'fails if less than 2 recps')

  // TODO // test more edge cases

  /* not sure how to code this in v4 draft compatible JSON schema */
  // const noGroupRecps = Mock({
  //   recps: [
  //     '@zXUllRkNYXkE3TikkY4GFMX3lTbj5E+604AkaO1xbz8=.ed25519',
  //     '@YXkE3TikkY4GFMX3lzXUllRkNTbj5E+604AkaO1xbz8=.ed25519'
  //   ]
  // })
  // t.false(isValid(noGroupRecps), 'fails if there is no group recp')

  t.end()
})
