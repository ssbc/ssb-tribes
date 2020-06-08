const pull = require('pull-stream')
const { MsgId } = require('./lib/cipherlinks')

module.exports = {
  previous
}

function previous (ssb) {
  var state = {
    listeners: [],
    previous: undefined
  }

  function subscribe (listener) {
    state.listeners.push(listener)
    if (state.previous !== undefined) listener(state.previous)
    // immediately emits current value (if it exists) for new subscribers
  }

  function set (msgIdOrNull) {
    state.previous = new MsgId(msgIdOrNull).toTFK()
    state.listeners.forEach(fn => fn(state.previous))
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
  ssb.post(m => set(m.key))

  return subscribe
}
