const Validator = require('is-my-ssb-valid')
const schema = require('private-group-spec').schema.group.init

module.exports = Validator(schema)
// TODO move to
// spec/group/init/index.js
