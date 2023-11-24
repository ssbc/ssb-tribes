# ssb-tribes

A scuttlebutt plugin for managing encrypted groups.
Implements the [private group spec](https://github.com/ssbc/private-group-spec) which uses the [envelope spec](https://github.com/ssbc/envelope-spec/).

This is the successor to [`ssb-private1`](https://github.com/ssbc/ssb-private1).

## Example Usage

```js
const SecretStack = require('secret-stack')
const config = require('ssb-config')
const caps = require('ssb-caps')

const stack = SecretStack({ caps })
  .use(require('ssb-db2/core'))
  .use(require('ssb-classic'))
  .use(require('ssb-db2/compat'))
  .use(require('ssb-db2/compat/feedstate'))
  .use(require('ssb-box2'))
  .use(...)

const ssb = stack({
  ...config,
  box2: {
    ...config.box2,
    legacyMode: true
  }
})
```


```js
ssb.tribes.create({}, (err, info) => {
  const { groupId } = info

  const content = {
    type: 'post',
    test: 'kia ora, e te whānau',
    recps: [groupId] // <<< you can now put a groupId in the recps
  }
  ssb.tribes.publish(content, (err, msg) => {
    // tada msg is encrypted to group!

    const cookie = '@YXkE3TikkY4GFMX3lzXUllRkNTbj5E+604AkaO1xbz8=.ed25519'
    const staltz = '@QlCTpvY7p9ty2yOFrv1WU1AE88aoQc4Y7wYal7PFc+w=.ed25519'

    ssb.tribes.invite(groupId, [cookie, staltz], {}, (err, invite) => {
      // two friends have been sent an invite which includes the decryption key for the group
      // they can now read the message I just published, and publish their own messages to the group

    })
  })
})
```

## Behaviour

This plugin provides functions for creating groups and administering things about them, but it also provides a bunch of "automatic" behviour.

1. **When you publish a message with `recps` using `ssb.tribes.publish` it will auto-encrypt** the content when:
    - there are 1-16 FeedIds (direct mesaaging)
    - there is 1 GroupId (private group messaging)
    - there is 1 GroupId followed by 1-15 FeedId
        - NOTE this is currently only recommended for group invite messages as it's easy to leak group info
2. **When you receive an encrypted message with suffix `.box2` it will attempt to auto-decrypt** the content:
    - on success this value will then be accessible in all database queries/ indexes
    - if it fails because it didn't have the key, the message gets passed to the next auto-decrypter to attempt
    - if it fails because something is clearly horribly wrong in the encyprtion and it should have worked, it throws an error (check this)
3. **When you receive an invite to a new group, you will auto-decrypt all messages**
    - we re-index your whole database, which will reveal new messages you can decrypt
        - in the future we will only re-index messages you previously could not decrypt
    - keys for groups are stored in a off-chain key-store
4. **If you've been given the readKey for a particular message, you can use that**
    - e.g. `ssb.get({ id, private: true, key: readKey }, cb)`

**NOTES**:
- Work on this project was resourced by Āhau. The name "tribes" was suggested by that project, and the API mostly reflects that. Some internal variables also use "group", as this is following the  _private group spec_. You can read tribe/ group interchangeably.
- Each tribe has a `<GroupId>` (a unique identifier) which can be mapped to that tribe's `<GroupKey>` (a shared encryption key). The `<GroupId>` is related to the initialisation message for the tribe, but is safe to share (leaks no info about who started the group). The reason we can't use the "public" part of the `<GroupKey>` as an id (like `<FeedId>`) is that there isn't a public part - it's a symmetric key!
- `<FeedId>` is synonymous with the public key of a particular device (`@...sha256`). The private group spec details how we map this to a shared key between you (the author) and that recipient.


## Requirements

A Secret-Stack server running the plugins:
- `ssb-db2/core` >= 7.1.1
- `ssb-classic`
- `ssb-tribes`
- `ssb-db2/compat`
- `ssb-db2/compat/feedstate`
- `ssb-box2` >= 7.4.0
- `ssb-replicate` - (optional) used to auto-replicate people who you're in groups with

The secret stack option `config.box2.legacyMode` also needs to be `true`.

## API

### `ssb.tribes.publish(content, cb)`

A wrapper around `ssb.db.create` that makes sure you have correct tangles (if relevant) in your message. Mutates `content`. You need to put recipients in `content.recps`.

### `ssb.tribes.create(opts, cb)`

Mint a new private group.

where:
- `opts` *Object*
    - `opts.addPOBox` *Boolean* attaches a P.O. Box to the group and publish the keys into the group
        - default: `false`
- `cb` *Function* is a callback with signature `cb(err, data)` where `data` is an Object with properties:
    - `groupId` *String* - a cipherlink that's safe to use publicly to name the group, and is used in `recps` to trigger enveloping messages to that group
    - `groupKey` *Buffer*  - the symmetric key used for encryption by the group
    - `groupInitMsg` *Object* - a copy of the  (enveloped) message used to initialise the group

_This method calls `group.add` and `group.addAuthors` for you (adding you)_

### `ssb.tribes.invite(groupId, [authorId], opts, cb)`

Adds an author to a group you belong to.
This publishes a message that both this new author AND the group can see, and contains the info
needed to get the new person started (the `groupKey` and `root`).

where:
- `groupId` *String* - is a cloaked id for a group you're a part of
- `[authorId]` *Array* - is a collection of the feed ids of authors you're going to invite
    - **NOTE**: you are limited to inviting at most 15 authors per call of this method
- `opts` *Object* - is of form `{ text }` which allows you to (optionally) post some welcoming or intruducing message along with the invte.
- `cb` *Function* - is a callback with signature `cb(err, invite)`

_This method calls `group.addAuthors` for you (adding that person to the group register for you)_

### `ssb.tribes.addNewAuthorListener(fn)`

Listens for when new authors are added to a tribe, and fires a given function

- `fn` *Function* - a function to call when a new author is added to the tribe. The function receives:
    - `groupId` *String* - the id of the tribe
    - `newAuthors` *Array* - array of new authors added to the tribe

### `ssb.tribes.excludeMembers(groupId, [authorId], cb)`

Excludes an author from a group you belong to. 
This publishes a message that both this new author AND the group can see. 
**NOTE** :warning:  this only politely asks the author to leave the group, we don't rotate keys (yet)

where:
- `groupId` *String* - is a cloaked id for a group you're a part of
- `[authorId]` *Array* - is a collection of the feed ids of authors you're going to exclude
- `cb` *Function* - is a callback with signature `cb(err, exclusion)`

### `ssb.tribes.list(cb)`

Returns a list of all known group IDs.
By default this excludes subgroups

Alternatively `ssb.tribes.list({ subtribes: true }, cb)` will give you all group IDs (including those of subtribes)

### `ssb.tribes.get(groupId, cb)`

Returns group metadata for a given group:

- `key` - the decryption key for the group
- `scheme` - the scheme the key is associated with (e.g. DM, group)
- `root` - the initial message which started the group

### `ssb.tribes.listAuthors(groupId, cb)`

Lists all the authors (feedIds) who you know are part of the group with id `groupId`

### `ssb.tribes.subtribe.create(groupId, opts, cb)`

A convenience method which:
- mints a group
- publishes a `link` in the parent group which advertises the existence of the subGroup
- mints a `poBoxId` for that group so that the parent group member can send messages to the subGroup
- then creates a `link` inside the existing group (linking group + subGroup)

where:
- `groupId` *String* - the id of the _parent_ group this subGroup will be linked to
- `opts` *Object*
    - `opts.addPOBox` *Boolean* attaches a P.O. Box to the group and publish the keys into the group
        - default: `false`
    - `opts.admin` *Booelan* adds meta-data to the link flagging it as the admin subgroup
- `cb` *Function* is a callback with signature `cb(err, data)` where `data` is an Object with properties:
    - `groupId` *String* - a cipherlink that's safe to use publicly to name the subGroup, and is used in `recps` to trigger enveloping messages to that group
    - `groupKey` *Buffer*  - the symmetric key used for encryption by the subGroup
    - `poBoxId` *Buffer* - the asymetric key used to encrypt messages sent from outside of the subGroup
    - `groupInitMsg` *Object* - a copy of the  (enveloped) message used to initialise the subGroup

_This method calls `ssb.tribes.create`_

### `ssb.tribes.subtribe.get(groupId, cb)`

_alias of `ssb.tribes.get`_

---

## API (Extras)

These endpoints give you access to additional features, such as:
- **registering groups**:
    - `ssb.tribes.register(groupId, info, cb)`
- **linking your feed to a group**
    - `ssb.tribes.link.create({ group, name }, cb)`
- **linking subGroups to a group**
    - `ssb.tribes.link.createSubGroupLink({ group, subGroup, admin }, cb)`
- **finding groups/ subGroups**
    - `ssb.tribes.findByFeedId(feedId, cb)`
    - `ssb.tribes.findSubGroupLinks(groupId, cb)`
    - `ssb.tribes.subtribe.findParentGroupLinks(subGroupId, cb)`
- **P.O. Box tools**
    - `ssb.tribes.poBox.create(opts, cb)`
    - `ssb.tribes.addPOBox(groupId, cb)`
    - `ssb.tribes.poBox.get(groupId, cb)`
- **self-DM keys**
    - `ssb.tribes.ownKeys.list(cb)`: returns a list of self-DM keyinfo. Always a length of 1 (only a list for historical reasons). The keyinfo has the format `{ key: Buffer, scheme: String }`.
    - `ssb.tribes.ownKeys.register(key)`: sets the self-DM key (buffer).
- **managing people applying to join to a group**
    - deprecated, please use [ssb-tribes-registration](https://gitlab.com/ahau/lib/ssb-plugins/ssb-tribes-registration)
    - for the old docs, [see here](./README.deprecated.md)


### `ssb.tribes.register(groupId, info, cb)`

Registers a new group that you have learnt about.

_NOTE: mainly used internally_

where:
- `groupId` *String* - is a cloaked group id (see `private-group-spec/group-id/README.md`)
- `info` *Object* - contains data of form `{ key, scheme }` where:
  - `key` *String* - a 32 byte symmetric key for the group (as a `base64` encoded string)
  - `scheme` *String* (optional) - a description of the key management scheme this key is part of
- `cb`[ *Function* - a callback with signature `cb(err: Error, success: Boolean)`

### `ssb.tribes.poBox.create(opts, cb)`

Creates a P.O. Box key-pair, which is like a one-way group messaging setup with a public and private curve25519 keypair.

- `opts` *Object* - currently unused but still required
- `cb` *Function* is a callback with signature `cb(err, data)` where `data` is an Object with properties:
  - `poBoxId` *String* - a cipherlink that can be used in `recps` by anyone, to send messages only those with the secret key can open
  - `public` *Buffer*  - the public part of the keypair
  - `secret` *Buffer*  - the secret part of the keypair

### `ssb.tribes.addPOBox(groupId, cb)`

Creates a P.O. Box key-pair, and publishes a message announcing those to a group.
This will be heard by group members, allowing them to open messages sent to that P.O. Box

- `groupId` *String* - group to add P.O. Box to
- `cb` *Function* is a callback with signature `cb(err, poBoxId)`

### `ssb.tribes.poBox.get(groupId, cb)`

Get the keypair that's attached to a group

- `groupId` *String* - group that has a P.O. Box
- `cb` *Function* is a callback with signature `cb(err, { poBoxId, key })`

### `ssb.tribes.link.create({ group, name }, cb)`

Creates a message of type `link/feed-group` which links your feedId to a valid group. (i.e. you can only create links between your feedId and profiles at the moment)

Arguments:
- `group` *GroupId* - the id of the private group you're creating a link with (linking your scuttlebutt feed with that group)
- `name` *String* (optional) - this adds your nickname for the group
- `cb` *Function* - callback with signature `(err, link)` where `link` is the link message

Note:
- this link will be encrypted to the group you're linking to (i.e. link will have `recps: [groupId]`)

### `ssb.tribes.link.createSubGroupLink({ group, subGroup, admin }, cb)`

Creates a message of tyoe `link/group-subGroup` which links a group to a subGroup

Arguments:

- `group` *GroupId* - the id of the parent private group
- `subGroup` *GroupId* - the id of the subGroup you're linking to `group`
- `admin` *Boolean* - when set to true, this flag is used to tell when a subgroup is the admin-only subgroup for the group
- `cb` - *Function* - call with signature `(err, link)` where `link` is the link message
Note:
- this link will be encrypted to the parent group (i.e. link will have `recps: [group]`)

### `ssb.tribes.findByFeedId(feedId, cb)`

Find groups which have linked with a feedId (see `ssb.tribes.link.create`).

- `feedId` *FeedId* is a string
- `cb` *function* is a callback with signature `cb(err, data)` where `data` is an Array of items of form:
  ```js
  {
    groupId: GroupId,
    recps: Recps, // an array of recipients who know about this link (should just be the group)
    states: [
      {
        head: MsgId,
        state: {
          name: null|String
        }
      }
    ]
  }
  ```

NOTE: the strange format with states is to leave easy support for multiple editors (of a link to a group) in the future

### `ssb.tribes.findSubGroupLinks(groupId, cb)`

Find subGroups which have linked with a groupId (see `ssb.tribes.link.createSubGroupLink`).

- `groupId` *GroupId* is a string representing the `groupId` of the parent group
- `cb` *function* is a callback with signature `cb(err, data)` where `data` is an Array of items of form:
  ```js
  [{
    linkId: MsgId,
    groupId: GroupId,
    subGroupId: GroupId,
    admin: Boolean,
    recps: Recps, // an array of recipients who know about this link (should just be the group)
  }]
  ```

### `ssb.tribes.subtribe.findParentGroupLinks(subGroupId, cb)`

Find subGroups which have linked with a groupId (see `ssb.tribes.link.createSubGroupLink`).

- `subGroupId` *GroupId* is a string representing the `groupId` of the subGroup
- `cb` *function* is a callback with signature `cb(err, data)` where `data` is an Array of items of form:
  ```js
  [{
    linkId: MsgId,
    groupId: GroupId, // the parent group
    subGroupId: GroupId,
    recps: Recps, // an array of recipients who know about this link (should just be the group)
  }]
  ```


## TODO

- [ ] add the latest known "sequence" at time of add-member, so we know if we need to reindex!
