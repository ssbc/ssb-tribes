const { poBoxInfo } = require('../../lib/spec-field-types')

module.exports = {
  type: 'group/po-box',
  tangle: 'poBox',
  props: {
    keys: poBoxInfo
  },
  arbitraryRoot: true
}
