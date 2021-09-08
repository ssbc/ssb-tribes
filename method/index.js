const Application = require('./application')
const POBox = require('./po-box')
const Link = require('./link')
const Group = require('./group')

module.exports = function Method (ssb, keystore, state) {
  const application = Application(ssb)
  const poBox = POBox(ssb, keystore)
  const link = Link(ssb)
  const group = Group(ssb, keystore, state, poBox)

  return {
    group: {
      init: patient(group.init),
      addMember: patient(group.addMember),
      addPOBox: patient(group.addPOBox)
    },
    link: {
      create: patient(link.create),
      createSubgroupLink: patient(link.createSubgroupLink),
      findGroupByFeedId: patient(link.findGroupByFeedId),
      findGroupBySubgroupId: patient(link.findGroupBySubgroupId),
      findSubgroupByGroupId: patient(link.findSubgroupByGroupId)
    },
    // TODO - rm patient from these?
    application: {
      create: patient(application.create),
      get: patient(application.get), // note get not read
      update: patient(application.update),
      comment: patient(application.comment),
      accept: patient(application.accept),
      reject: patient(application.reject),
      list: patient(application.list)
    },
    poBox: {
      create: patient(poBox.create)
    }
  }

  function patient (fn) {
    return function (...args) {
      if (state.loading.keystore.value === false) return fn(...args)

      state.loading.keystore.once(() => fn(...args))
    }
  }
}
