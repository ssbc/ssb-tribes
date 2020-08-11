const Validator = require('is-my-ssb-valid')
const definitions = require('ssb-schema-definitions')()
const schema = {
  $schema: 'http://json-schema.org/schema#',
  type: 'object',
  required: ['type', 'version', 'tangles'],
  properties: {
    type: {
      type: 'string',
      pattern: '^group/application$'
    },
    version: {
      type: 'string',
      pattern: '^v1$'
    },
    groupId: {
      $ref: '#/definitions/cloakedMessageId'
    },
    addMember: {
      type: 'object',
      required: ['add'],
      properties: {
        add: {
          type: 'string'
        }
      },
      additionalProperties: false
    },
    text: {
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
      minItems: 1,
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
  definitions
}

module.exports = {
  isValid: Validator(schema)
}
