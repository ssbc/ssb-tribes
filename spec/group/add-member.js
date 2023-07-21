const Validator = require('is-my-ssb-valid')
const schema = require('private-group-spec/group/add-member/v1/schema.json')

module.exports = {
  isValid: Validator(schema)
}

// NOTE
// here's how you can do additional validation.
// our schema is so rad we don't need this though!

// const { isCloakedMsg: isGroup } = require('ssb-ref')
// module.exports = Validator(schema, [
//   groupInFirstSlot,
//   exactlyOneGroup
// ])

// function groupInFirstSlot (content) {
//   return (
//     isGroup(content.recps[0]) ||
//     new Error('group/add-member message requires recps[0] is a groupId')
//   )
// }

// function exactlyOneGroup ({ recps }) {
//   return (
//     recps.filter(isGroup).length === 1 ||
//     new Error('group/add-member message allow exactly 1 groupId')
//   )
// }
