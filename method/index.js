module.exports = function Method (ssb) {
  return {
    group: {
      create: require('./group/create')(ssb)
    }
  }
}
