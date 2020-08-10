const pull = require('pull-stream')
const { isValid } = require('./spec/group/add-member')

module.exports = {
  addMember
}

function addMember (ssb) {
  var listeners = []

  function subscribe (listener) {
    listeners.push(listener)
  }

  // TODO problem is this doesn't track what group/add-member have been processed
  // and watching "live" doesn't really guarentee ...
  // I think we need a flumeview here because that tracks what's been past it / processed.

  pull(
    ssb.messagesByType({ type: 'group/add-member', private: true, live: true }),
    pull.filter(m => m.sync !== true), // live queries emit { sync: true } when up to speed!
    pull.filter(m => m.value.author !== ssb.id), // ignore messages I write
    pull.filter(isValid),
    pull.drain(m => {
      listeners.forEach(fn => fn(m))
    })
  )

  return subscribe
}
