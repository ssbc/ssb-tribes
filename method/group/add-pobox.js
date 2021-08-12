const Crut = require('ssb-crut')
const PoBox = require('../../spec/group/add-pobox')

module.exports = function GroupPobox (ssb, keystore, state) {
  const poBox = new Crut(ssb, PoBox)

  return function groupPobox (groupId, { publicKey, secretKey }, cb) {
    const info = keystore.group.get(groupId)

    if (!info) return cb(new Error('unknown groupId: ' + groupId))

    const { root } = info

    const content = {
      type: 'group/poBox',
      keys: {
        set: { publicKey, secretKey }
      },
      tangles: {
        poBox: { root, previous: [root] }, // TODO calculate previous for poBox tangle
        group: { root, previous: [root] } // TODO: need a way to validate this root
        // NOTE: this is a dummy entry which is over-written in publish hook
        // it's needed to pass isValid
      },
      recps: [groupId]
    }

    if (!poBox.spec.isUpdate(content)) return cb(new Error(poBox.spec.isUpdate.errorsString))

    ssb.publish(content, cb)
  }
}
