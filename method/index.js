const Init = require('./group/init')
const AddMember = require('./group/add-member')
const { CreateFeedGroupLink, CreateGroupSubgroupLink } = require('./link/create')
const FindByGroupByFeedId = require('./link/find-group-by-feedid')
const Application = require('./application')

module.exports = function Method (ssb, keystore, state) {
  const application = Application(ssb)

  return {
    group: {
      init: patient(Init(ssb, keystore, state)),
      addMember: patient(AddMember(ssb, keystore, state))
    },
    link: {
      create: patient(CreateFeedGroupLink(ssb)),
      createSubgroupLink: patient(CreateGroupSubgroupLink(ssb)),
      findGroupByFeedId: FindByGroupByFeedId(ssb)
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
