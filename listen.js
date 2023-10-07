// const flumeView = require('flumeview-reduce')
const pull = require('pull-stream')
const CRUT = require('ssb-crut')

const { isValid: isAddMember } = require('./spec/group/add-member')
const { isValid: isExcludeMember } = require('./spec/group/exclude-member')

const poBoxSpec = require('./spec/group/po-box')
const mockSSB = { backlinks: true, query: true }
const { isUpdate: isPOBox } = new CRUT(mockSSB, poBoxSpec).spec

module.exports = {
  mutateMembers (ssb) {
    const query = [{
      $filter: {
        value: {
          content: {
            type: { $in: ['group/add-member', 'group/exclude-member'] }
          }
        }
      }
    }]

    return pull(
      ssb.query.read({ query, old: true, live: true }),
      pull.filter(m => m.sync !== true),
      pull.filter(msg => isAddMember(msg) || isExcludeMember(msg)),
      pull.unique('key')
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
      pull.unique('key'),
      // NOTE we DO NOT filter our own messages out
      // this is important for rebuilding indexes and keystore state if we have to restore our feed
      pull.drain(emit)
    )
  }
}
