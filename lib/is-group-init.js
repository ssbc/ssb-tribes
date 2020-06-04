const Validator = require('is-my-ssb-valid')
const schema = require('private-group-spec/group/init/schema.json')

module.exports = Validator(schema)
// TODO move to
// spec/group/init/index.js
