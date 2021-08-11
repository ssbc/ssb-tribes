const Init = require('./group/init')
const AddMember = require('./group/add-member')
const Application = require('./application')
const Link = require('./link')

module.exports = function Method (ssb, keystore, state) {
  const application = Application(ssb)
  const link = Link(ssb)

  return {
    group: {
      init: patient(Init(ssb, keystore, state)),
      addMember: patient(AddMember(ssb, keystore, state))
    },
    link: {
      create: patient(link.create),
      createSubgroupLink: patient(link.createSubgroupLink),
      findGroupByFeedId: patient(link.findGroupByFeedId)
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
    }
  }

  function patient (fn) {
    return function (...args) {
      if (state.loading.keystore.value === true) return fn(...args)

      state.loading.keystore.once(() => fn(...args))
    }
  }
}
