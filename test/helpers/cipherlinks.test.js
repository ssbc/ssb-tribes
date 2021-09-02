const test = require('tape')
const { isMsg, isFeedId } = require('ssb-ref')
const isPoBox = require('ssb-private-group-keys/lib/is-po-box') // TODO find better home

const { FeedId, POBoxId, MsgId } = require('./cipherlinks')

test('Cipherlink helpers', t => {
  t.true(isFeedId(new FeedId().mock().toSSB()), 'mock feedId')
  t.true(isPoBox(new POBoxId().mock().toSSB()), 'mock POBoxId')
  t.true(isMsg(new MsgId().mock().toSSB()), 'mock msgId')
  t.end()
})
