const test = require('tape')
const { isMsg, isFeedId } = require('ssb-ref')
const { FeedId, MsgId } = require('../helpers/cipherlinks')

test('Cipherlink/FeedId', t => {
  t.true(isFeedId(new FeedId().mock().toSSB()), 'mock feedId')
  t.end()
})

test('Cipherlink/MsgId', t => {
  t.true(isMsg(new MsgId().mock().toSSB()), 'mock msgId')
  t.end()
})
