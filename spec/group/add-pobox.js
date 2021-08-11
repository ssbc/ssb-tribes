const { poBox } = require('../lib/field-types')

module.exports = {
  type: 'group/poBox',
  tangle: 'poBox',
  staticProps: {
    root: { $ref: '#/definitions/messageId' },
    version: {
      type: 'string',
      pattern: '^v1$'
    }
  },
  props: {
    keys: poBox
  }
}
