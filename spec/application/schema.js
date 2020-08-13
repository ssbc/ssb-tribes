const {
  messageId,
  cloakedMessageId,
  feedId,
  tangle
} = require('ssb-schema-definitions')()
const { msgIdRegex } = require('ssb-ref')

const root = {
  $schema: 'http://json-schema.org/schema#',
  type: 'object',
  required: ['type', 'version', 'groupId', 'recps', 'tangles'],
  properties: {
    type: { type: 'string', pattern: '^group/application$' },
    version: { type: 'string', pattern: '^v1$' },
    groupId: { $ref: '#/definitions/cloakedMessageId' },

    comment: {
      type: 'object',
      required: ['append'],
      properties: {
        append: {
          type: 'string'
        }
      },
      additionalProperties: false
    },
    recps: {
      type: 'array',
      items: { $ref: '#/definitions/feedId' },
      minItems: 2,
      maxItems: 16
    },
    tangles: {
      type: 'object',
      required: ['application'],
      properties: {
        application: {
          $ref: '#/definitions/tangle/root'
        }
      }
    }
  },
  additionalProperties: false,
  definitions: {
    messageId,
    cloakedMessageId,
    feedId,
    tangle
  }
}

const update = {
  $schema: 'http://json-schema.org/schema#',
  type: 'object',
  required: ['type', 'version', 'recps', 'tangles'],
  properties: {
    type: { type: 'string', pattern: '^group/application$' },
    version: { type: 'string', pattern: '^v1$' },
    groupId: { $ref: '#/definitions/cloakedMessageId' },

    comment: {
      type: 'object',
      required: ['append'],
      properties: {
        append: { type: 'string' }
      },
      additionalProperties: false
    },
    addMember: {
      type: 'object',
      patternProperties: {
        [msgIdRegex]: { type: 'integer' }
      }
    },

    recps: {
      type: 'array',
      items: { $ref: '#/definitions/feedId' },
      minItems: 2,
      maxItems: 16
    },
    tangles: {
      type: 'object',
      required: ['application'],
      properties: {
        application: {
          $ref: '#/definitions/tangle/any'
        }
      }
    }
  },
  additionalProperties: false,
  definitions: {
    messageId,
    cloakedMessageId,
    feedId,
    tangle
  }
}

module.exports = {
  root: JSON.stringify(root, null, 2),
  update: JSON.stringify(update, null, 2)
}
