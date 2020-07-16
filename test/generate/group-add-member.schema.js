const { messageId, cloakedMessageId, feedId, tangle } = require('ssb-schema-definitions')()
const isCanonicalBase64 = require('is-canonical-base64')
const secretKeyRegex = isCanonicalBase64('', '', 32) // no prefix, no suffix, 32 bytes

const { print } = require('../helpers')

// {
//   type: 'group/add-member',
//   version: 'v1',
//   groupKey: '3YUat1ylIUVGaCjotAvof09DhyFxE8iGbF6QxLlCWWc=',
//   root: '%THxjTGPuXvvxnbnAV7xVuVXdhDcmoNtDDN0j3UTxcd8=.sha256',
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
  required: ['type', 'version', 'groupKey', 'root', 'tangles'],
  properties: {
    type: { type: 'string', pattern: '^group/add-member$' },
    version: { type: 'string', pattern: '^v1$' },

    groupKey: { type: 'string', pattern: secretKeyRegex },
    root: { $ref: '#/definitions/messageId' },

    text: { type: 'string' },

    recps: {
      type: 'array',
      items: [
        { $ref: '#/definitions/cloakedMessageId' }
      ],
      additionalItems: { $ref: '#/definitions/feedId' },
      minItems: 2,
      maxItems: 16
    },

    tangles: {
      type: 'object',
      required: ['group', 'members'],
      properties: {
        group: { $ref: '#/definitions/tangle/update' },
        members: { $ref: '#/definitions/tangle/any' }
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

print('schema/group-add-member.schema.json', schema)

module.exports = JSON.stringify(schema, null, 2)
