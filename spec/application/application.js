const {
  messageId,
  cloakedMessageId,
  feedId,
  tangle
} = require('ssb-schema-definitions')()

module.exports = {
  type: 'tribe/application',
  tangle: 'application',

  staticProps: {
    groupdId: {
      ...cloakedMessageId,
      required: true
    },
    version: {
      type: 'string',
      pattern: '^v1$',
      required: true
    }
  },

  props: {
  },
  addMember: {
    type: 'object',
    patternProperties: {
      [msgIdRegex]: { type: 'integer' }
    }
  }
}
