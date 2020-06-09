const test = require('tape')
const vectors = [
  require('private-group-spec/vectors/group-id1.json')
]
const SCHEMES = require('private-group-spec/key-schemes.json').scheme
const { unboxKey, DeriveSecret, CloakedMsgId } = require('envelope-js')
const LABELS = require('envelope-spec/derive_secret/constants.json')

const { FeedId, MsgId } = require('../../lib/cipherlinks')
const Secret = require('../../lib/secret-key')
const { decodeLeaves } = require('../helpers')
const groupId = require('../../lib/group-id')

test('GroupId', t => {
  /* testing the API of our function */
  const feed_id = new FeedId().mock()
  const prev_msg_id = new MsgId().mock()
  // const prev_msg_id = new MsgId(null) // also works
  const msg_key = new Secret() // top-level encryption key

  const groupInitMsg = {
    key: new MsgId().mock().toSSB(),
    value: {
      author: feed_id.toSSB(),
      previous: prev_msg_id.toSSB()
    }
  }
  const A = groupId({ groupInitMsg, msgKey: msg_key.toBuffer() })

  const derive = DeriveSecret(feed_id.toTFK(), prev_msg_id.toTFK())
  const read_key = derive(msg_key.toBuffer(), [LABELS.read_key])
  const B = groupId({ groupInitMsg, readKey: read_key })
  t.equal(A, B, 'can calculate groupId with msg_key OR read_key')

  groupInitMsg.value.meta = {
    unbox: read_key.toString('base64')
  }
  const C = groupId({ groupInitMsg })
  t.equal(B, C, 'can calculate groupId from an unboxed message')

  // -----------------------------------------------------------

  /* testing against shared test-vectors */
  vectors.forEach(vector => {
    decodeLeaves(vector)
    const { group_init_msg, group_key } = vector.input

    const trial_keys = [{
      key: group_key,
      scheme: SCHEMES.private_group
    }]

    const { content, author, previous } = group_init_msg.value
    const envelope = Buffer.from(content.replace('.box2', ''), 'base64')
    const feed_id = new FeedId(author).toTFK()
    const prev_msg_id = new MsgId(previous).toTFK()

    const read_key = unboxKey(envelope, feed_id, prev_msg_id, trial_keys)

    const group_id = groupId({ groupInitMsg: group_init_msg, readKey: read_key })

    t.equal(group_id, vector.output.group_id, 'correctly construct group_id')
  })

  t.end()
})
