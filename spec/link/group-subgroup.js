module.exports = {
  type: 'link/group-subGroup',
  tangle: 'link',
  staticProps: {
    parent: { $ref: '#/definitions/cloakedMessageId', required: true },
    child: { $ref: '#/definitions/cloakedMessageId', required: true }
  },
  props: {
  }
}
