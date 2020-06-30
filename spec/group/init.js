const Validator = require('is-my-ssb-valid')
const schema = require('private-group-spec').schema.group.init

module.exports = {
  isValid: Validator(schema)
}
