// const flumeView = require('flumeview-reduce')
const pull = require('pull-stream')
const CRUT = require('ssb-crut')
const { where, and, type, isDecrypted, live: dbLive, toPullStream } = require('ssb-db2/operators')

const { isValid: isAddMember } = require('./spec/group/add-member')
const { isValid: isExcludeMember } = require('./spec/group/exclude-member')

const poBoxSpec = require('./spec/group/po-box')

module.exports = {
  addMember (ssb) {
    return pull(
      ssb.db.query(
        where(
          and(
            isDecrypted('box2'),
            type('group/add-member'),
          )
        ),
        dbLive({ old: true }),
        toPullStream()
      ),
      // NOTE this will run through all messages on each startup, which will help guarentee
      // all messages have been emitted AND processed
      // (same not true if we used a dummy flume-view)
      pull.filter(m => m.sync !== true),
      pull.filter(isAddMember),
      pull.unique('key')
      // NOTE we DO NOT filter our own messages out
      // this is important for rebuilding indexes and keystore state if we have to restore our feed
    )
  },
  excludeMember (ssb) {
    return pull(
      ssb.db.query(
        where(
          and(
            isDecrypted('box2'),
            type('group/exclude-member'),
          )
        ),
        dbLive({ old: true }),
        toPullStream()
      ),
      pull.filter(m => m.sync !== true),
      pull.filter(isExcludeMember),
      pull.unique('key')
    )
  },
  poBox (ssb, emit) {
    const { isUpdate: isPOBox } = new CRUT(ssb, poBoxSpec).spec

    pull(
      ssb.db.query(
        where(
          and(
            isDecrypted('box2'),
            type('group/po-box'),
          )
        ),
        dbLive({ old: true }),
        toPullStream()
      ),
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
