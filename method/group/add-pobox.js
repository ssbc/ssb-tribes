const Crut = require('ssb-crut')
const PoBox = require('../../spec/group/add-pobox')

module.exports = function GroupAddPoBox (ssb, keystore, scuttlePoBox) {
  const {
    spec: { isUpdate }
  } = new Crut(ssb, PoBox)

  return function groupAddPoBox (groupId, cb) {
    const info = keystore.group.get(groupId)
    if (!info) return cb(new Error('unknown groupId: ' + groupId))

    scuttlePoBox.create({}, (err, data) => {
      if (err) return cb(err)

      const { poBoxId, poBoxKey } = data
      const { root } = info

      const content = {
        type: 'group/poBox',
        keys: {
          set: {
            poBoxId,
            key: poBoxKey.toString('base64')
          }
        },
        tangles: {
          poBox: { root, previous: [root] },
          // TODO 2021-09-03 (mix)
          // tangles.poBox isn't a real tangle yes
          // teach Crut to be relaxed about the root node being a different type, then use crut.update(groupId, props, cb)
          group: { root, previous: [root] } // dummy - get's replaced by publish hook
        },
        recps: [groupId]
      }

      if (!isUpdate(content)) return cb(new Error(isUpdate.errorsString))

      ssb.publish(content, (err, msg) => {
        if (err) return cb(err)
        cb(null, poBoxId)
      })
    })
  }
}
