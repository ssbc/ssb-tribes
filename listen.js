// const flumeView = require('flumeview-reduce')
const { isValid } = require('./spec/group/add-member')
const pull = require('pull-stream')

module.exports = {
  addMember
}

function addMember (ssb, emit) {
  // const isIndexing = () => {
  //   const status = ssb.status()
  //   if (status.progress.indexes.target < 0) return true
  //   return status.progress.indexes.target !== status.sync.plugins.links
  //   // we only care if links is up to date, as this is what
  //   // messagesByType is based on
  // }

  pull(
    ssb.messagesByType({ type: 'group/add-member', private: true, live: true }),
    // NOTE this will run through all messages on each startup, which will help guarentee
    // all messages have been emitted AND processed
    // (same not true if we used a dummy flume-view)
    pull.filter(m => m.sync !== true),
    pull.filter(isValid),
    // NOTE we DO NOT filter our own messages out
    // this is important for rebuilding indexes and keystore state if we have to restore our feed
    pull.drain(emit)
  )
}
