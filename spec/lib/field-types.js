const Overwrite = require('@tangle/overwrite')
const overwrite = (schema, opts = {}) => Overwrite({ valueSchema: schema, ...opts })

module.exports = {
  string: overwrite({ type: ['string', 'null'] })
}
