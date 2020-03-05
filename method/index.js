module.exports = function Method (ssb, keystore, state) {
  return {
    group: {
      create: require('./group/create')(ssb, keystore, state),
      invite: require('./group/invite')(ssb, keystore, state)
    }
  }
}
