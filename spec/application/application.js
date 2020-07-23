const Validator = require('is-my-ssb-valid')
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
      items: [
        {
          $ref: '#/definitions/feedId'
          // $ref: '#/definitions/cloakedMessageId'
        }
      ],
      // additionalItems: {
      //   $ref: '#/definitions/feedId'
      // },
      minItems: 1,
      maxItems: 15
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
    messageId: {
      type: 'string',
      pattern: '^%[a-zA-Z0-9\\/+]{42}[AEIMQUYcgkosw048]=.sha256$'
    },
    cloakedMessageId: {
      type: 'string',
      pattern: '^%[a-zA-Z0-9\\/+]{42}[AEIMQUYcgkosw048]=.cloaked$'
    },
    feedId: {
      type: 'string',
      pattern: '^@[a-zA-Z0-9\\/+]{42}[AEIMQUYcgkosw048]=.(?:sha256|ed25519)$'
    },
    tangle: {
      root: {
        type: 'object',
        required: ['root', 'previous'],
        properties: {
          root: {
            type: 'null'
          },
          previous: {
            type: 'null'
          }
        }
      },
      update: {
        type: 'object',
        required: ['root', 'previous'],
        properties: {
          root: {
            $ref: '#/definitions/messageId'
          },
          previous: {
            type: 'array',
            item: {
              $ref: '#/definitions/messageId'
            },
            minItems: 1
          }
        }
      },
      any: {
        oneOf: [
          {
            $ref: '#/definitions/tangle/root'
          },
          {
            $ref: '#/definitions/tangle/update'
          }
        ]
      }
    }
  }
}

module.exports = {
  isValid: Validator(schema)
}
