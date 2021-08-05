const test = require('tape')
const { isMsg, isFeedId } = require('ssb-ref')
const { FeedId, POBoxId, MsgId } = require('./cipherlinks')

// TODO replace with actual test
const isPOBoxId = id => id.startsWith('ssb://diffie-hellman/curve25519/')

test.only('Cipherlink helpers', t => {
  t.true(isFeedId(new FeedId().mock().toSSB()), 'mock feedId')
  console.log(new POBoxId().mock().toSSB())
  t.true(isPOBoxId(new POBoxId().mock().toSSB()), 'mock POBoxId')
  t.true(isMsg(new MsgId().mock().toSSB()), 'mock msgId')
  t.end()
})
