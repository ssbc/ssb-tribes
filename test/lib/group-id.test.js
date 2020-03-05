const test = require('tape')
const vector = require('private-group-spec/vectors/group-id1.json')
const SCHEMES = require('private-group-spec/key-schemes.json').scheme
const { unboxKey } = require('envelope-js')

const { FeedId, MsgId } = require('../../lib/cipherlinks')
const groupId = require('../../lib/group-id')
const { decodeLeaves } = require('../helpers')

test('GroupId', t => {
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

  const group_id = groupId(group_init_msg, null, read_key)

  t.equal(group_id, vector.output.group_id, 'correctly construct group_id')
  t.end()
})
