const pull = require('pull-stream')
const { MsgId } = require('./lib/cipherlinks')
const { isValid } = require('./spec/group/add-member')

module.exports = {
  previous,
  addMember
}

function previous (ssb) {
  var listeners = []
  var prev = undefined // eslint-disable-line

  function subscribe (listener) {
    listeners.push(listener)
    if (prev !== undefined) listener(prev)
    // immediately emits current value (if it exists) for new subscribers
  }

  function set (msgIdOrNull) {
    prev = new MsgId(msgIdOrNull).toTFK()
    listeners.forEach(fn => fn(prev))
  }

  /* initial previous lookup */
  // TODO - research which is most direct source for this initial load
  pull(
    ssb.createUserStream({ id: ssb.id, reverse: true, limit: 1 }),
    pull.collect((err, msgs) => {
      if (err) throw err

      set(msgs.length ? msgs[0].key : null)
    })
  )

  /* ongoing previous listening */
  // ssb.post(m => {
  //   if (m.value.author !== ssb.id) {
  //     return
  //   }

  //   set(m.key)
  // })
  ssb.previous(id => set(id))

  return subscribe
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
