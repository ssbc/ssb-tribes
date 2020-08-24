const pull = require('pull-stream')

function replicate ({ from, to, live = true, name = abbrev }, done) {
  to.getFeedState(from.id, (err, state) => {
    if (err) throw err

    pull(
      from.createHistoryStream({ id: from.id, seq: state.sequence + 1, live }),
      pull.filter(m => m.sync !== true),
      pull.asyncMap((m, cb) => to.add(m.value, cb)),
      pull.asyncMap((m, cb) =>
        to.get({ id: m.key, private: true, meta: true }, cb)
      ),
      pull.drain(
        (m) => {
          const type = m.value.content.type || '?' // encrypted
          const extra = type === 'group/add-member'
            ? `, ${m.value.content.recps.filter(r => r[0] === '@').map(name)}`
            : ''

          const replication = `${name(m.value.author)}: ${m.value.sequence} --> ${name(to.id)}`
          console.log(`${replication}   (sees: ${type}${extra})`)
        },
        (err) => {
          if (typeof done === 'function') return done(err)
          if (err) {
            throw err
          }
        }
      )
    )
  })
}
module.exports = replicate

function abbrev (key) {
  return key.slice(0, 9)
}
