const Validator = require('is-my-ssb-valid')
const schema = require('./schema')

module.exports = {
  isRoot: Validator(schema.root),
  isUpdate: Validator(schema.update)
}
