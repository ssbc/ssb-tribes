const Crut = require('ssb-crut')
const PoBox = require('../../spec/group/add-pobox')

module.exports = function GroupPobox (ssb, keystore, state) {
  const poBox = new Crut(ssb, PoBox)

  function isValidRoot (content) {
    isValidRoot.error = null
    // fake a root message to validate static props!
    const T = {
      ...content,
      tangles: {
        poBox: {
          root: null,
          previous: null
        }
      }
    }

    if (!poBox.spec.isRoot(T)) {
      isValidRoot.error = poBox.spec.isRoot.errorsString
      return false
    }

    return true
  }

  function isValidUpdate (content) {
    isValidUpdate.error = false
    // fake an update message to validate mutable props only!
    const T = { ...content }
    delete T.tangles.group

    // delete static props
    delete T.version
    delete T.root

    if (!poBox.spec.isUpdate(T)) {
      isValidUpdate.error = poBox.spec.isUpdate.errorsString
      return false
    }

    return true
  }

  // TODO: choose whether to pass in the groupInit OR use the groupId to get it
  return function groupPobox (groupId, keys, groupInit, cb) {
    const { root } = keystore.group.get(groupId)

    const content = {
      type: 'group/poBox',
      version: 'v1',
      keys: {
        set: { publicKey: keys.publicKey, secretKey: keys.secretKey }
      },
      root,
      tangles: {
        poBox: {
          root: groupInit,
          previous: [groupInit] // TODO calculate previous for poBox tangle
        },

        group: { root: groupInit, previous: [root] } // TODO: need a way to validate this root
        // NOTE: this is a dummy entry which is over-written in publish hook
        // it's needed to pass isValid
      },
      recps: [groupId]
    }

    if (!isValidRoot(content)) return cb(new Error(isValidRoot.error))
    if (!isValidUpdate(content)) return cb(new Error(isValidUpdate.error))

    ssb.publish(content, cb)
  }
}
