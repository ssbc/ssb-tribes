const crypto = require('crypto')

function Key () {
  return crypto.randomBytes(32).toString('base64')
}

function GroupId () {
  return crypto.randomBytes(32).toString('base64')
}

module.exports = {
  Key,
  GroupId
}
