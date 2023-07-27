const Link = require('./link')
const Group = require('./group')

module.exports = function Method (ssb, keystore, state) {
  const link = Link(ssb)
  const group = Group(ssb, keystore, state)

  return {
    group: {
      init: patient(group.init),
      addMember: patient(group.addMember),
      listAuthors: patient(group.listAuthors),
      addPOBox: patient(group.addPOBox),
      getPOBox: group.getPOBox
    },

    link
    // create createSubGroupLink findGroupByFeedId findParentGroupLinks findSubGroupLinks
  }

  function patient (fn) {
    // for functions that need keystore to be ready
    return function (...args) {
      if (state.loading.keystore.value === false) return fn(...args)

      state.loading.keystore.once(() => fn(...args))
    }
  }
}
