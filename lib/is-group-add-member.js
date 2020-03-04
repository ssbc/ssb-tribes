const Validator = require('is-my-ssb-valid')
const schema = require('private-group-spec/group/add-member/schema.json')

module.exports = Validator(schema)
