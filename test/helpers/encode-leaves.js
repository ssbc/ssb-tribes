module.exports = function encodeLeaves (vector) {
  Object.entries(vector)
    .forEach(([key, value]) => {
      if (Buffer.isBuffer(value)) vector[key] = value.toString('base64')
      else if (value === null) {}
      else if (typeof value === 'object') vector[key] = encodeLeaves(value)
    })

  return vector
}
