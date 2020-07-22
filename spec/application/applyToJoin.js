const Validator = require('is-my-ssb-valid')
const schema = {
  $schema: 'http://json-schema.org/schema#',
  type: 'object',
  required: ['type', 'version', 'groupId', 'tangles'],
  properties: {
    type: {
      type: 'string',
      pattern: '^group/apply-to-join$'
    },
    version: {
      type: 'string',
      pattern: '^v1$'
    },
    groupId: {
      type: 'string',
      pattern: '^%[a-zA-Z0-9\\/+]{42}[AEIMQUYcgkosw048]=.cloaked$'
    },
    root: {
      $ref: '#/definitions/messageId'
    },
    text: {
      type: 'string'
    },
    recps: {
      type: 'array',
      items: [
        {
          $ref: '#/definitions/cloakedMessageId'
        }
      ],
      additionalItems: {
        $ref: '#/definitions/feedId'
      },
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
