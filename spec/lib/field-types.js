const Overwrite = require('@tangle/overwrite')
const isBase64 = require('is-canonical-base64')()

const overwrite = (schema, opts = {}) => Overwrite({ valueSchema: schema, ...opts })

module.exports = {
  string: overwrite({ type: ['string', 'null'] }),
  poBox: overwrite({
    type: 'object',
    required: ['publicKey', 'secretKey'],
    properties: {
      publicKey: {
        type: ['string', 'null'],
        pattern: '^ssb://'
      },
      privateKey: {
        type: ['string', 'null'],
        pattern: isBase64
      }
    }
  })
}
