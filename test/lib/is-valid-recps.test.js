/* eslint-disable camelcase */

const test = require('tape')
const { isValidRecps } = require('../../lib')
const { GroupId, FeedId, POBox } = require('../helpers')

test('is-valid-recps', t => {
  const validExamples = [
    {
      recps: new Array(16).fill(0).map(i => FeedId()),
      msg: 'up to 16 feedId only'
    },
    { recps: [GroupId()], msg: 'groupId only' },
    { recps: [GroupId(), FeedId()], msg: 'groupId + feedId' }
  ]
  validExamples.forEach(({ recps, msg }) => {
    t.true(
      isValidRecps(recps),
      `valid: ${msg || JSON.stringify(recps)}`
    )
  })

  const invalidExamples = [
    { recps: [] },
    { recps: 'dog' },
    { recps: ['dog'] },

    { recps: [FeedId(), 'dog'] },
    {
      recps: new Array(17).fill(0).map(i => FeedId()),
      msg: 'more than 16 recps'
    },
    { recps: [GroupId(), GroupId()], msg: 'more than one groupId' },
    { recps: [FeedId(), GroupId()], msg: 'groupId in slot other than first' }
  ]

  invalidExamples.forEach(({ recps, msg }) => {
    t.false(
      isValidRecps(recps),
      `invalid: ${msg || JSON.stringify(recps)}`
    )
  })

  t.end()
})
