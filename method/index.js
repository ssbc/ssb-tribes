const Init = require('./group/init')
const AddMember = require('./group/add-member')

module.exports = function Method (ssb, keystore, state) {
  return {
    group: {
      init: patient(Init(ssb, keystore, state)),
      addMember: patient(AddMember(ssb, keystore, state))
    }
  }

  function patient (fn) {
    // this can be improved later
    return function (...args) {
      if (!state.isReady) return setTimeout(() => fn.apply(null, args), 500)

      fn.apply(null, args)
    }
  }
}
