module.exports = function replicate (
  { from, to, live = true, name = abbrev, through },
  done
) {
  pull(
    from.createHistoryStream({ id: from.id, live }),
    pull.through(through),
    pull.asyncMap((m, cb) => to.add(m.value, cb)),
    pull.asyncMap((m, cb) =>
      to.get({ id: m.key, private: true, meta: true }, cb)
    ),
    pull.drain(
      m => {
        const type = m.value.content.type || '?' // encrypted
        const added =
          type === 'group/add-member'
            ? `: ${m.value.content.recps.filter(r => r[0] === '@').map(name)}`
            : ''
        console.log(
          `${name(m.value.author)} -> ${name(to.id)}  |  ${abbrev(
            m.key
          )} ${type} ${added}`
        )
      },
      err => {
        if (typeof done === 'function') return done(err)
        if (err) throw err
      }
    )
  )
}
