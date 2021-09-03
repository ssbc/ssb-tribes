const Init = require('./group/init')
const AddMember = require('./group/add-member')
const AddPoBox = require('./group/add-pobox')
const Application = require('./application')
const POBox = require('./po-box')
const Link = require('./link')

module.exports = function Method (ssb, keystore, state) {
  const application = Application(ssb)
  const poBox = POBox(ssb, keystore)
  const link = Link(ssb)

  return {
    group: {
      init: patient(Init(ssb, keystore, state)),
      addMember: patient(AddMember(ssb, keystore)),
      addPoBox: patient(AddPoBox(ssb, keystore, poBox))
    },
    link: {
      create: patient(link.create),
      createSubgroupLink: patient(link.createSubgroupLink),
      findGroupByFeedId: patient(link.findGroupByFeedId),
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
