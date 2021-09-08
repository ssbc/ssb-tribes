module.exports = {
  type: 'link/group-subgroup',
  tangle: 'link',
  staticProps: {
    parent: { $ref: '#/definitions/cloakedMessageId', required: true },
    child: { $ref: '#/definitions/cloakedMessageId', required: true }
  },
  props: {
  }
}
