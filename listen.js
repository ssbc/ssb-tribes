const flumeView = require('flumeview-reduce')
const { isValid } = require('./spec/group/add-member')

module.exports = {
  addMember
}

const VERSION = 1
function addMember (ssb, emit) {
  // HACK: leveraging flume to access stream of newest messages
  ssb._flumeUse('add-member-dummy-index', flumeView(
    VERSION,
    (_, msg) => {
      if (msg.value.author === ssb.id) return _ // ignore messages I write
      if (!isValid(msg)) return _

      // HACK: using this ssb.emit to be able to test this listener
      // TODO: change to only use ssb.emit when testing?
      ssb.emit('group/add-member', msg)
      emit(msg)
      return _
    }
  ))
}
