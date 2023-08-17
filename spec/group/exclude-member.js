const Validator = require('is-my-ssb-valid')
const addMemberSchema = require('private-group-spec/group/add-member/v1/schema.json')
const baseSchema = require('private-group-spec/group/exclude-member/schema.json')

// we use the tribes2 exclude message type but with sigil links instead of URIs
const schema = {
  ...baseSchema,
  definitions: {
    ...baseSchema.definitions,
    feedId: addMemberSchema.definitions.feedId,
    groupId: addMemberSchema.definitions.cloakedMessageId,
    messageId: addMemberSchema.definitions.messageId
  }
}

module.exports = {
  isValid: Validator(schema)
}
