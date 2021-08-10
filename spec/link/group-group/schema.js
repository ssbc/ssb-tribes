const { feedId, messageId, cloakedMessageId, tangle } = require('ssb-schema-definitions')()

const schema = {
  $schema: 'http://json-schema.org/schema#',
  type: 'object',
  required: ['type', 'parent', 'child', 'recps', 'tangles'],
  properties: {
    type: {
      type: 'string',
      pattern: '^link/group-subgroup'
    },
    parent: { $ref: '#/definitions/cloakedMessageId' },
    child: { $ref: '#/definitions/cloakedMessageId' },

    recps: {
      type: 'array',
      items: [
        { $ref: '#/definitions/cloakedMessageId' }
      ],
      minItems: 1,
      maxItems: 1
    },

    tangles: {
      type: 'object',
      required: ['link'],
      properties: {
        link: { $ref: '#/definitions/tangle/root' }
      }
    }
  },
  additionalProperties: false,
  definitions: {
    feedId,
    messageId,
    cloakedMessageId,
    tangle: { root: tangle.root }
  }
}

module.exports = {
  root: JSON.stringify(schema, null, 2)
}
