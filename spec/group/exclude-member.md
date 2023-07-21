# `group/exclude-member`

The format of the message being published is the same as [the one that tribes2 uses](https://github.com/ssbc/private-group-spec/blob/64962d2f4b9c2b1b50adc05a7858eda38a73511f/group/exclude-member/schema.json) but the feedId definition has been replaced with the classic sigil feed link, and the groupId has been replaced with the cloaked group link. Also, apart from the actual message, we don't rotate epochs (group secret) on exclusion.

Just like add-member, this also updates the members tangle. The members tangle is used to calculate the latest membership state of the group. In case of conflicts, it errs on the side of excluding a member rather than letting them stay (they can always be added back in).