# ssb-private2

Introduces evelope encryption to scuttlebutt.

**STATUS: WIP**

## Example Usage

```js
const SecretStack = require('secret-stack')
const config = require('ssb-config')
const shs = // from ssb-caps for main network, or your alt-net key

const SSB = SecretStack({ caps: { shs } })
  .use(require('ssb-db'))         // << required
  .use(require('ssb-private2'))

const ssb = SSB(config)
```


```js
const content = {
  type: 'profile/person',
  //....
  recps: {
    <GroupId>,
    <FeedId>
  }
}
ssb.publish(content, (err, data) => {
})
```

Later, any of the following will result in a happiliy readable message (for you and those who share the `GroupKey`):
- you use `server.get(msgKey, { private: true }, cb)`
- you run any db query which might have matched that message

**NOTE**:
- `<GroupId>` is a unique identifier which can be mapped to the `<GroupKey>` for that Group. The importance of these being distinct is that a `<GroupId>` is designed to leak no information about who is in the group, and is therefore safe to reference in public contexts.
- `<FeedId>` is synonymous with the public key of a particular device (`@...sha256`). Said another way, the id of a feed is currently synonymous with it's (public) key.

## Requirements

A Secret-Stack server running the plugins `ssb-db` and `ssb-private2`

## API

### `ssb.private2.group.create(name, cb)`

Mint a new private group.

where:
- `name` *String* is a name you'd like to give the group
- `cb` *Function* is a callback with signature `cb(err, data)` where `data` is an Object with properties:
  - `groupId` *String* - a cipherlink that's safe to use publicly to name the group, and is used in `recps` to trigger enveloping messages to that group
  - `groupKey` *Buffer*  - the symmetric key used for encryption by the group
  - `groupInitMsg` *Object* - a copy of the  (enveloped) message used to initialise the group

_This method calls `group.add` and `group.addAuthors` for you (adding you)_


### `ssb.private2.group.inviteAuthors(groupId, [authorId], opts, cb)`

Adds an author to a group you belong to.
This publishes a message that both this new author AND the group can see, and contains the info
needed to get the new person started (the `groupKey` and `initialMsg`).

where:
- `groupId` *String* - is a cloaked id for a group you're a part of
- `[authorId]` *Array* - is a collection of the feed ids of authors you're going to invite
    - **NOTE**: you are limited to inviting at most 7 authors per call of this method
- `opts` *Object* - is of form `{ text }` which allows you to (optionally) post some welcoming or intruducing message along with the invte.
- `cb` *Function* - is a callback with signature `cb(err, invite)`

_This method calls `group.addAuthors` for you (adding that person to the group register for you)_


### `ssb.private2.group.register(groupId, info, cb)`

Registers a new group that you have learnt about.

_NOTE: mainly used internally_

where:
- `groupId` *String* - is a cloaked group id (see `private-group-spec/group-id/README.md`)
- `info` *Object* - contains data of form `{ key, scheme }` where:
  - `key` *String* - a 32 byte symmetric key for the group (as a `base64` encoded string)
  - `scheme` *String* (optional) - a description of the key management scheme this key is part of
- `cb`[ *Function* - a callback with signature `cb(err: Error, success: Boolean)`



### `ssb.private2.group.registerAuthors(groupId, [authorId], cb)`

Makes an off-log note that some author(s) are part of a group.
This is used to know which group keys to consider when you receive a private message from a particular author.

_NOTE: mainly used internally_

where:
- `groupId` *String* - is a the id for the group you want to not these users are part of
- `[authorId]` - *Array* is a connection of feedIds
- `cb` *Function* - has signature `cb(err, success)`


### `ssb.private2.author.keys(authorId, cb)`

Get all the keys that a message published by `authorId` could have used to encrypt with.
`cb` has signature `cb(err, keys)` where `keys` is an Array of Buffers.

This is used for suppliying `trial_keys` to `envelope-js`'s unbox method.

_NOTE: mainly used internally_


---


### `ssb.private2.group.removeAuthors(groupId, [authorId], cb)`
:warning: NOT YET IMPLEMENTED

Where cb has signature `cb(err: Error, success: Boolean)`



### `ssb.private2.group.remove(groupId, cb)`
:warning: NOT YET IMPLEMENTED


## Questions

- how does this "key store" interact with flume views?
  - if we discover a new key entrust part way through indexing ... we have to trigger re-indexing of other views
    - might need to reset this view too, as opening existing groups will reveal other entrusts sent to members ....
      - oh god this could get recurrsive. As in ok I know Ben has given me a key so I re-index with and try this key on Ben's encrypted messages, but then I reveal from here that Ben has entrusted the key to Cherese .. ok add Cherese as a member, start again because Cherese may have said something before....
      - I think this means when we entrust we need to know the root message + author.
  - should the key-store sit outside flume views?
    - if it does then we can manually add things from outside system...
