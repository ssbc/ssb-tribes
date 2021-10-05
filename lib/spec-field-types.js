const Overwrite = require('@tangle/overwrite')
const isBase64 = require('is-canonical-base64')('', '', 32)

const overwrite = (schema, opts = {}) => Overwrite({ valueSchema: schema, ...opts })

module.exports = {
  string: overwrite({ type: ['string', 'null'] }),
  boolean: overwrite({ type: ['boolean', 'null'] }),

  poBoxInfo: overwrite({
    type: ['object', 'null'],
    required: ['poBoxId', 'key'],
    properties: {
      poBoxId: {
        type: ['string'],
        pattern: '^ssb:identity/po-box/' // TODO check the tail more closely
      },
      key: {
        type: ['string'],
        pattern: isBase64.toString().slice(1, -1)
      },
      additionalProperties: false
    }
  })
}
