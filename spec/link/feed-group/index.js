const Validator = require('is-my-ssb-valid')
const schema = require('./schema')

module.exports = {
  isValid: Validator(schema)
}
