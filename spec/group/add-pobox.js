const { poBox } = require('../lib/field-types')

module.exports = {
  type: 'group/poBox',
  tangle: 'poBox',
  props: {
    keys: poBox
  }
}
