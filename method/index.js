const Link = require('./link')
const Group = require('./group')

module.exports = function Method (ssb) {
  const link = Link(ssb)
  const group = Group(ssb)

  return {
    group,

    link
    // create createSubGroupLink findGroupByFeedId findParentGroupLinks findSubGroupLinks
  }
}
