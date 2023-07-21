const Validator = require('is-my-ssb-valid')
const schema = require('private-group-spec/group/initRoot/v1/schema.json')

module.exports = {
  isValid: Validator(schema)
}
