const { string } = require('../../lib/spec-field-types')

module.exports = {
  type: 'link/feed-group',
  tangle: 'link',
  staticProps: {
    parent: { $ref: '#/definitions/feedId', required: true },
    child: { $ref: '#/definitions/cloakedMessageId', required: true }
  },
  props: {
    name: string
  }
}
