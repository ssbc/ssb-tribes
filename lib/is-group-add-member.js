const Validator = require('is-my-ssb-valid')
const schema = require('private-group-spec/group/add-member/schema.json')
const isCloaked = require('./is-cloaked-msg-id')

module.exports = Validator(schema, [
  groupInFirstSlot,
  oneGroupAtMost
])

// TODO move to
// spec/group/add-member/index.js

function groupInFirstSlot (content) {
  return (
    isCloaked(content.recps[0]) ||
    new Error('group/add-member message requires recps[0] is a groupId')
  )
}

function oneGroupAtMost ({ recps }) {
  return (
    recps.filter(isCloaked).length === 1 ||
    new Error('group/add-member message cannot be sent to multiple groups')
  )
}
