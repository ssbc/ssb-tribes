const { isValid } = require('../../spec/group/add-member')

module.exports = function GroupInvite (ssb, keystore, state) {
  return function groupInvite (groupId, authorIds, opts = {}, cb) {
    const { key, root } = keystore.group.get(groupId)
    // TODO cap authorIds to 15 (relevant to maxAttempts for unboxing)

    const content = {
      type: 'group/add-member',
      version: 'v1',
      groupKey: key.toString('base64'),
      root,
      tangles: {
        members: {
          root: root,
          previous: [root] // TODO calculate previous for members tangle
        },

        group: { root, previous: [root] }
        // NOTE: this is a dummy entry which is over-written in publish hook
        // it's needed to pass isValid
      },
      recps: [groupId, ...authorIds]
    }

    if (opts.text) content.text = opts.text

    if (!isValid(content)) return cb(new Error(isValid.errorsString))

    ssb.publish(content, cb)
  }
}
