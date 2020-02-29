const test = require('tape')
const vector = require('private-group-spec/group/group-id/vector1.json')

const groupId = require('../../lib/group-id')
const { MsgId } = require('../../lib/cipherlinks')
const { decodeLeaves } = require('../helpers')

test('Cipherlink/GroupId', t => {
  decodeLeaves(vector)
  const { group_init_msg, group_key } = vector.input

  var group_id = groupId(group_init_msg, group_key)

  t.equal(group_id, vector.output.group_id, 'correctly construct group_id')
  t.end()
})
