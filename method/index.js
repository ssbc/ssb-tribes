const Crut = require('ssb-crut')
const Init = require('./group/init')
const AddMember = require('./group/add-member')
const FindByGroupByFeedId = require('./link/find-group-by-feedid')
const Application = require('./application')
const FeedGroupLink = require('../spec/link/feed-group')
const GroupSubgroupLink = require('../spec/link/group-subgroup')

module.exports = function Method (ssb, keystore, state) {
  const application = Application(ssb)
  const linkFeedCrut = new Crut(ssb, FeedGroupLink)
  const linkSubgroupCrut = new Crut(ssb, GroupSubgroupLink)

  return {
    group: {
      init: patient(Init(ssb, keystore, state)),
      addMember: patient(AddMember(ssb, keystore, state))
    },
    link: {
      create ({ group, name }, cb) {
        const input = {
          parent: ssb.id,
          child: group,
          name,
          recps: [group]
        }

        // set the recps on the link to be the same as the recps on the settings
        if (!name) delete input.name

        patient(linkFeedCrut.create.bind(linkFeedCrut)(input, (err, linkId) => {
          if (err) return cb(err)

          linkFeedCrut.read(linkId, cb)
        }))
      },
      createSubgroupLink: ({ group, subgroup }, cb) => {
        const input = {
          parent: group,
          child: subgroup,
          recps: [group]
        }

        patient(linkSubgroupCrut.create.bind(linkSubgroupCrut)(input, (err, linkId) => {
          if (err) return cb(err)

          linkSubgroupCrut.read(linkId, cb)
        }))
      },
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
