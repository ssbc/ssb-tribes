const Validator = require('is-my-ssb-valid')
const schema = require('private-group-spec').schema.group.application

module.exports = {
  isValid: Validator(schema)
}
