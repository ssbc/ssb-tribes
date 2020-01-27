function isGroupKey (str) {
  if (typeof str !== 'string') return false
  if (str.length !== 44) return false
  if (Buffer.from(str, 'base64').length !== 32) return false

  return true
}

function isGroupId (str) {
  // TODO

  return isGroupKey(str)
}

module.exports = {
  isGroupKey,
  isGroupId
}
