# Group Id

We want to be able to mention a group without revealing info about it.
We'll also use this `group_id` in the `recps` field, and when we go to publish a message,
map that `group_id` into that groups symmetric keys (`group_key`) which we then use for box2 encryption

**Properties we want**
- leaks nothing about the group _e.g. who started it, where it started_
- can be used by those who know about the group to look up the associated key

## Definition

The `group_id` is defined as:

```
var info = ["group_id", init_msg_id]
var group_id = HKDF.Expand(group_key, encode(info), 32)
```

where:
- `init_msg_id` is the id of the message which initialised the group, in a binary type-format-key encoding (see `box2-spec/encoding/tfk.md`)
- `group_key` is the groups secret (symmetric) key
- `encode` is shallow-length-prefix encode (see `box2-spec/encoding/slp.md`)


## Design Considerations

1. the parts you could identify a group uniquely by are: 
    - it's `group_key` : this is only know by people who are "in the group". This makes it a good candidate for contributing to the identifier, but we can't use it raw, otherwise mentioning it publicly could accidentally leak access to the group.
    - it's `init_msg_id` : message ids are public, so if there was a public mention of a group you could see if running some DeriveGroupId on all message ids you have to try and discover starts of groups. This alone is can't be used to derive `group_id`.
2. this definition binds the id of the group to a particular `group_key`, which might make "key-cycling" weird
    - maybe this is good, the ID probably should reflect the current key in use
    - it would make uniquely referencing a group which had change it's key (and hence `group_id`) harder... you'd have to store a range of aliases for a group
    - we don't know if we'd do cycling of keys anyway...
3. this means the `group_id` is bound to the feed
    - it can't be set / determined until a group initialisation message is published
