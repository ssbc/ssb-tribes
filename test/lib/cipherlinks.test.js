const test = require('tape')
const { isMsg, isFeedId } = require('ssb-ref')
const { FeedId, MsgId } = require('../../lib/cipherlinks')

test('Cipherlink/FeedId', t => {
  const feedId = '@YXkE3TikkY4GFMX3lzXUllRkNTbj5E+604AkaO1xbz8=.ed25519'
  const id = new FeedId(feedId)

  const expected = Buffer.concat([
    Buffer.from([0]), // type = feed
    Buffer.from([0]), // format = ssb/classic
    Buffer.from('YXkE3TikkY4GFMX3lzXUllRkNTbj5E+604AkaO1xbz8=', 'base64')
  ])

  t.deepEqual(id.toTFK(), expected, 'toTFK')
  t.deepEqual(id.toSSB(), feedId, 'toSSB')

  t.true(isFeedId(new FeedId().mock().toSSB()), 'mock feedId')

  t.end()
})

test('Cipherlink/MsgId', t => {
  const msgId = '%onDYxSjsIb4d3KhgHC7g5wdHLWw/7zygIBvZEx7v6KU=.sha256'
  const id = new MsgId(msgId)

  const expected = Buffer.concat([
    Buffer.from([1]), // type = msg
    Buffer.from([0]), // format = ssb/classic
    Buffer.from('onDYxSjsIb4d3KhgHC7g5wdHLWw/7zygIBvZEx7v6KU=', 'base64')
  ])

  t.deepEqual(id.toTFK(), expected, 'toTFK')
  t.deepEqual(id.toSSB(), msgId, 'toSSB')

  t.true(isMsg(new MsgId().mock().toSSB()), 'mock msgId')
  t.end()
})
