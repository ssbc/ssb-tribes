const isValid = require('../../lib/is-group-add-member')

module.exports = function GroupInvite (ssb, keystore) {
  return function groupInvite (groupId, authorIds, opts = {}, cb) {
    const { key, initialMsg } = keystore.group.get(groupId)
    // TODO cap authorIds to 15 (relevant to maxAttempts for unboxing)

    const content = {
      type: 'group/add-member',
      version: 'v1',
      groupKey: key.toString('base64'),
      initialMsg,
      tangles: {
        group: {
          root: initialMsg,
          previous: [initialMsg] // TODO calculate previous for whole group
        },

        members: {
          root: initialMsg,
          previous: [initialMsg] // TODO calculate previous for members tangle
        }
      },
      recps: [groupId, ...authorIds]
    }

    if (opts.text) content.text = opts.text

    if (!isValid(content)) return cb(new Error(isValid.errorsString))

    ssb.publish(content, cb)
  }
}
