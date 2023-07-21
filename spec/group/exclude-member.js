const Validator = require('is-my-ssb-valid')
const addMemberSchema = require('private-group-spec/group/add-member/v1/schema.json')
const schema = require('private-group-spec/group/exclude-member/schema.json')

// we use the tribes2 exclude message type but with sigil links instead of URIs
schema.definitions.feedId = addMemberSchema.definitions.feedId
schema.definitions.groupId = addMemberSchema.definitions.cloakedMessageId
schema.definitions.messageId = addMemberSchema.definitions.messageId

module.exports = {
  isValid: Validator(schema)
}
