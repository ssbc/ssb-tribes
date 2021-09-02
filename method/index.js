const Init = require('./group/init')
const AddMember = require('./group/add-member')
const CreateLink = require('./link/create')
const FindByGroupByFeedId = require('./link/find-group-by-feedid')
const Application = require('./application')
const POBox = require('./po-box')

module.exports = function Method (ssb, keystore, state) {
  const application = Application(ssb)
  const poBox = POBox(ssb, keystore)

  return {
    group: {
      init: patient(Init(ssb, keystore, state)),
      addMember: patient(AddMember(ssb, keystore, state))
    },
    link: {
      create: patient(CreateLink(ssb)),
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
