const { messageId, feedId, tangle } = require('ssb-schema-definitions')()
const { print } = require('../helpers')

const isCanonicalBase64 = require('is-canonical-base64')
const cloakedMsgRegex = isCanonicalBase64('%', '\\.cloaked', 32)

const secretKeyRegex = isCanonicalBase64('', '', 32)

// {
//   type: 'group/add-member',
//   version: 'v1',
//   groupKey: '3YUat1ylIUVGaCjotAvof09DhyFxE8iGbF6QxLlCWWc=',
//   initialMsg: '%THxjTGPuXvvxnbnAV7xVuVXdhDcmoNtDDN0j3UTxcd8=.sha256',
//   text: 'welcome keks!',                                      // optional
//   recps: [
//     '%vof09Dhy3YUat1ylIUVGaCjotAFxE8iGbF6QxLlCWWc=.cloaked',  // group_id
//     '@YXkE3TikkY4GFMX3lzXUllRkNTbj5E+604AkaO1xbz8=.ed25519'   // feed_id (for new person)
//   ],

//   tangles: {
//     group: {
//       root: '%THxjTGPuXvvxnbnAV7xVuVXdhDcmoNtDDN0j3UTxcd8=.sha256',
//       previous: [
//         '%Sp294oBk7OJxizvPOlm6Sqk3fFJA2EQFiyJ1MS/BZ9E=.sha256'
//       ]
//     },
//     members: {
//       root: '%THxjTGPuXvvxnbnAV7xVuVXdhDcmoNtDDN0j3UTxcd8=.sha256',
//       previous: [
//         '%lm6Sqk3fFJA2EQFiyJ1MSASDASDASDASDASDAS/BZ9E=.sha256',
//         '%Sp294oBk7OJxizvPOlm6Sqk3fFJA2EQFiyJ1MS/BZ9E=.sha256'
//       ]
//     }
//   }
// }

const schema = {
  $schema: 'http://json-schema.org/schema#',
  type: 'object',
  required: ['type', 'version', 'groupKey', 'initialMsg', 'tangles'],
  properties: {
    type:       { type: 'string', pattern: '^group/add-member$' },
    version:    { type: 'string', pattern: '^v1$' },

    groupKey:   { type: 'string', pattern: secretKeyRegex },
    initialMsg: { $ref: '#/definitions/messageId' },

    text:       { type: 'string' },

    recps: {
      type: 'array',
      minItems: 2,
      maxItems: 8,
      items: {
        anyOf: [
          { $ref: '#/definitions/feedId' },
          { $ref: '#/definitions/cloakedMessageId' }
        ]
      }
    },

    tangles: {
      type: 'object',
      required: ['group', 'members'],
      properties: {
        group:   { $ref: '#/definitions/tangle/update' },
        members: { $ref: '#/definitions/tangle/update' }
      }
    },

    definitions: {
      messageId,
      feedId,
      // TODO extract to ssb-schema-defintions
      cloakedMessageId: { type: 'string', pattern: cloakedMsgRegex },
      tangle
    }
  },
  additionalProperties: false
}

print('schema/group-add-member.schema.json', schema)
