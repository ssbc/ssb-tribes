const { mkdirSync } = require('fs')
const level = require('level')
const charwise = require('charwise')
const pull = require('pull-stream')
const pullLevel  = require('pull-level')

module.exports = function Keychain (path) {
  mkdirSync(path, { recursive: true })

  const db = level(path, { valueEncoding: charwise })

  return {
    group: {
      add(groupId, groupKey, cb) {
        // TODO check groupId and groupKey are valid...
        db.put(['key', groupId, Date.now()], groupKey, cb)
      },
      list(cb) {
        const result = {}
        pull(
          pullLevel.read(db, {
            lte: ['key~', undefined, undefined], // "key~" is just above "key" in charwise sort
            gte: ['key', null, null]
          }),
          pull.through(({ key, value }) => {
            const groupId = key.split(',')[1]
            result[groupId] = value
          }),
          pull.collect((err) => {
            if (err) return cb(err)
            cb(null, result)
          })
        )
      }
    },
    close: db.close.bind(db)
  }
}
