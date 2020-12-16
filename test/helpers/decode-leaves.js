const _isBase64 = require('is-canonical-base64')()

module.exports = function decodeLeaves (vector) {
  Object.entries(vector)
    .forEach(([key, value]) => {
      if (isBase64(value)) vector[key] = Buffer.from(value, 'base64')
      else if (value === null) {} // eslint-disable-line
      else if (typeof value === 'object') vector[key] = decodeLeaves(value)
    })

  return vector
}

function isBase64 (value) {
  return (
    typeof value === 'string' &&
    _isBase64.test(value)
  )
}
