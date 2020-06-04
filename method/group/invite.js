module.exports = function GroupInvite (ssb, keystore) {
  return function groupInvite (groupId, authorIds, opts = {}, cb) {
    const { key, initialMsg } = keystore.group.get(groupId)
    // const { groupKey, 
    // TODO cap authorIds to 15 (relevant to maxAttempts for unboxing)

    const content = {
      type: 'group/add-member',
      version: 'v1',
      groupKey: key.toString('base64'),
      initialMsg,
      tangles: {
        // TODO figure out root + previous for whole group
        group: {
          root: initialMsg,
          previous: [initialMsg]
        },

        // TODO figure out previous for membership tangle (root is same as group.root)
        members: {
          root: initialMsg,
          previous: [initialMsg]
        }
      },
      recps: [groupId, ...authorIds]
    }

    if (opts.text) content.text = opts.text

    // TODO validate before publish

    ssb.publish(content, cb)
  }
}
