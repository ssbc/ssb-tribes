const { isBuffer } = Buffer
const isRegex = (el) => el.constructor === RegExp

module.exports = function encodeLeaves (vector) {
  Object.entries(vector)
    .forEach(([key, value]) => {
      if (value === null) return

      if (isBuffer(value)) {
        vector[key] = value.toString('base64')
      } else if (isRegex(value)) {
        vector[key] = value.toString()
          .replace(/^\//, '')
          .replace(/\/$/, '')
      } else if (typeof value === 'object') {
        vector[key] = encodeLeaves(value)
      }
    })

  return vector
}
