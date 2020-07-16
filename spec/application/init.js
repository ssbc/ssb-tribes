const Validator = require('is-my-ssb-valid')
const schema = require('private-group-spec').schema.application.init

module.exports = {
  isValid: Validator(schema)
}
