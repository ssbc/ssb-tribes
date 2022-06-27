// const flumeView = require('flumeview-reduce')
const pull = require('pull-stream')
const CRUT = require('ssb-crut')

const { isValid: isAddMember } = require('./spec/group/add-member')

const poBoxSpec = require('./spec/group/po-box')
const mockSSB = { backlinks: true, query: true }
const { isUpdate: isPOBox } = new CRUT(mockSSB, poBoxSpec).spec

module.exports = {
  addMember (ssb, emit) {
    pull(
      ssb.messagesByType({ type: 'group/add-member', private: true, live: true }),
      // NOTE this will run through all messages on each startup, which will help guarentee
      // all messages have been emitted AND processed
      // (same not true if we used a dummy flume-view)
      pull.filter(m => m.sync !== true),
      pull.filter(isAddMember),
      // NOTE we DO NOT filter our own messages out
      // this is important for rebuilding indexes and keystore state if we have to restore our feed
      pull.drain(emit)
    )
  },
  poBox (ssb, emit) {
    pull(
      ssb.messagesByType({ type: 'group/po-box', private: true, live: true }),
      // NOTE this will run through all messages on each startup, which will help guarentee
      // all messages have been emitted AND processed
      // (same not true if we used a dummy flume-view)
      pull.filter(m => m.sync !== true),
      pull.filter(isPOBox),
      // NOTE we DO NOT filter our own messages out
      // this is important for rebuilding indexes and keystore state if we have to restore our feed
      pull.drain(emit)
    )
  }
}
