const Overwrite = require('@tangle/overwrite')
const isBase64 = require('is-canonical-base64')()

const overwrite = (schema, opts = {}) => Overwrite({ valueSchema: schema, ...opts })

module.exports = {
  string: overwrite({ type: ['string', 'null'] }),
  poBox: overwrite({
    type: ['object', 'null'],
    required: ['publicKey', 'secretKey'],
    properties: {
      publicKey: {
        type: ['string'],
        pattern: '^ssb://'
      },
      secretKey: {
        type: ['string'],
        pattern: isBase64.toString().slice(1, -1)
      },
      additionalProperties: false
    }
  })
}
