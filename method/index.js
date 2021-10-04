const Application = require('./application')
const Link = require('./link')
const Group = require('./group')

module.exports = function Method (ssb, keystore, state) {
  const application = Application(ssb)
  const link = Link(ssb)
  const group = Group(ssb, keystore, state)

  return {
    group: {
      init: patient(group.init),
      addMember: patient(group.addMember),
      addPOBox: patient(group.addPOBox),
      getPOBox: group.getPOBox
    },

    link,
    // create createSubGroupLink findGroupByFeedId findParentGroupLinks findSubGroupLinks
    //
    application
    // create get update comment accept reject list
  }

  function patient (fn) {
    // for functions that need keystore to be ready
    return function (...args) {
      if (state.loading.keystore.value === false) return fn(...args)

      state.loading.keystore.once(() => fn(...args))
    }
  }
}
