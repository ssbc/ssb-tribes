module.exports = function encodeLeaves (vector) {
  Object.entries(vector.input)
    .forEach(([key, value]) => {
      vector.input[key] = Array.isArray(value)
        ? value.map(encode)
        : encode(value)
    })

  Object.entries(vector.output)
    .forEach(([key, value]) => {
      vector.output[key] = Array.isArray(value)
        ? value.map(encode)
        : encode(value)
    })

  return vector
}

function encode (value) {
  return Buffer.isBuffer(value)
    ? value.toString('base64')
    : value
}
