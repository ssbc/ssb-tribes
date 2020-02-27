const { isFeedId, isMsg } = require('ssb-ref')
const isCloakedId = require('../../lib/is-cloaked-msg-id')

const isBase64 = require('is-canonical-base64')()

module.exports = function decodeLeaves (vector) {
  Object.entries(vector)
    .forEach(([key, value]) => {
      if (typeof value === 'string' && isBase64.test(value)) vector[key] = Buffer.from(value, 'base64')
      else if (value === null) {}
      else if (typeof value === 'object') vector[key] = decodeLeaves(value)
    })

  return vector
}
