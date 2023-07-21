const Validator = require('is-my-ssb-valid')
const addMemberSchema = require('private-group-spec/group/add-member/v1/schema.json')
const schema = require('private-group-spec/group/exclude-member/schema.json')

schema.definitions.feedId = addMemberSchema.definitions.feedId
schema.definitions.groupId = addMemberSchema.definitions.cloakedMessageId

console.log('exclude member schema', schema)

module.exports = {
  isValid: Validator(schema)
}
