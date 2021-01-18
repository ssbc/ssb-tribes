// const flumeView = require('flumeview-reduce')
const { isValid } = require('./spec/group/add-member')
const pull = require('pull-stream')

module.exports = {
  addMember
}

function addMember (ssb, emit) {
  let messages = []

  const isSync = () => {
    return ssb.status().sync.since === ssb.status().sync.plugins.links
    // we only care if links is up to date, as this is what
    // messagesByType is based on
  }
  const interval = setInterval(
    () => {
      if (!isSync()) return
      // actually only care if links (messagesByType) index is up to date

      const _messages = messages
      messages = []

      _messages.forEach(emit)
      _messages.forEach(msg => ssb.emit('group/add-member', msg))
    },
    1e3
  )
  ssb.close.hook((close, args) => {
    clearInterval(interval)
    close(...args)
  })

  pull(
    ssb.messagesByType({ type: 'group/add-member', private: true, live: true }),
    pull.filter(m => m.sync !== true),
    pull.filter(m => m.value.author !== ssb.id),
    pull.through(m => {
      console.log(m.value.content)
      console.log(isValid(m))
      console.log(isValid.error)
    }),
    pull.filter(isValid),
    pull.drain(m => {
      console.log('gotcha!', m)
      messages.push(m)
    })
  )

  /* HACK: leveraging flume to access stream of newest messages */
  /* NOTE: the disadvantage of this approach is it will call rebuild again part way through
   * rebuilding, not sure impact. I think the above approach (wait till all indexed) is a better idea
   */

  // const VERSION = 1
  // ssb._flumeUse('add-member-dummy-index', flumeView(
  //   VERSION,
  //   (_, msg) => {
  //     if (msg.value.author === ssb.id) return _ // ignore messages I write
  //     if (!isValid(msg)) return _

  //     // HACK: using this ssb.emit to be able to test this listener
  //     // TODO: change to only use ssb.emit when testing?
  //     ssb.emit('group/add-member', msg)
  //     emit(msg)
  //     return _
  //   }
  // ))
}
