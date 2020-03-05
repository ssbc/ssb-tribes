module.exports = function GroupInvite (ssb, keystore) {
  return function groupInvite (groupId, authorIds, opts = {}, cb) {
    const content = {
      type: 'group/add-member',
      version: 'v1',
      // groupKey,
      // initialMsg,
      tangles: {
        // TODO figure out root + previous for whole group
        group: { root: null, previous: null },

        // TODO figure out previous for membership tangle (root is same as group.root)
        members: { root: null, previous: null }
      },
      recps: [groupId, ...authorIds]
    }

    if (opts.text) content.text = opts.text


    // TODO validate before publish

    ssb.publish(content, cb)
  }
}
