module.exports = function Method (ssb, keystore, state) {
  return {
    group: {
      init: require('./group/init')(ssb, keystore, state),
      addMember: require('./group/add-member')(ssb, keystore, state)
    }
  }
}
