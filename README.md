# ssb-tribes

A scuttlebutt plugin for managing encrypted groups.
Implements the [private group spec](https://github.com/ssbc/private-group-spec) which uses the [envelope spec](https://github.com/ssbc/envelope-spec/).

This is the successor to [`ssb-private1`](https://github.com/ssbc/ssb-private1).

**STATUS: WIP**

## Example Usage

```js
const SecretStack = require('secret-stack')
const config = require('ssb-config')
const caps = require('ssb-caps')

const stack = SecretStack({ caps })
  .use(require('ssb-db'))        // << required
  .use(require('ssb-backlinks')) // << required index
  .use(require('ssb-query'))     // << required index
  .use(require('ssb-tribes'))
  .use(require('ssb-private1'))  // if you want to support old encryption
                                 // *order matters*, load tribes first
  .use(...)

const ssb = stack(config)
```


```js
const content = {
  type: 'post',
  test: 'kia ora, e te whānau',
  recps: [ <GroupId>, <FeedId> ]
}

ssb.publish(content, (err, data) => {
  // tada, encrypted
})
```

Later, any of the following will result in a happiliy readable message (for you and those who share the `GroupKey`):
- you use `server.get(msgKey, { private: true }, cb)`
- you run any db query which might have matched that message

**NOTE**:
- Work on this project was resourced by Āhau. The name "tribes" was suggested by that project, and the API mostly reflects that. Some internal variables also use "group", as this is following the  _private group spec_. You can read tribe/ group interchangeably.
- Each tribe has a `<GroupId>` (a unique identifier) which can be mapped to that tribe's `<GroupKey>` (a shared encryption key). The `<GroupId>` is related to the initialisation message for the tribe, but is safe to share (leaks no info about who started the group). The reason we can't use the "public" part of the `<GroupKey>` as an id (like `<FeedId>`) is that there isn't a public part - it's a symmetric key!
- `<FeedId>` is synonymous with the public key of a particular device (`@...sha256`). The private group spec details how we map this to a shared key between you (the author) and that recipient.

## Requirements

A Secret-Stack server running the plugins `ssb-db` and `ssb-tribes`

## API

### `ssb.tribes.create(opts, cb)`

Mint a new private group.

where:
- `opts` *Object* (currently not used)
- `cb` *Function* is a callback with signature `cb(err, data)` where `data` is an Object with properties:
  - `groupId` *String* - a cipherlink that's safe to use publicly to name the group, and is used in `recps` to trigger enveloping messages to that group
  - `groupKey` *Buffer*  - the symmetric key used for encryption by the group
  - `groupInitMsg` *Object* - a copy of the  (enveloped) message used to initialise the group

_This method calls `group.add` and `group.addAuthors` for you (adding you)_

### `ssb.tribes.application.create(groupdId, recps, opts, cb)`

Creates a tribe application message directed to the administrators of a private-group.

where:
- `opts` *Object*:
  - `text` *String*: A text to be viewed by the Kaitiakis of a group

### `ssb.tribes.application.get(applicationId, cb)`

Returns the current state of a tribe application. Ex.:

```
{
  root: '%CXVDe5AoPVf83CoHYBpfplpzTU/YYkN56yge1nBG9wE=.sha256',
  applicantId: '@35wu1YDBx9NPsUXpe7bYmHb7BQFEfn2ZFh0DZ6OipA0=.ed25519',
  groupId: '%A9OUzXtv7BhaAfSMqBzOO6JC8kvwmZWGVxHDAlM+/so=.cloaked',
  recps:
   [ '@CQi7RZDHLHalHErknddXIczj6FulnAdbYfULVSXTbns=.ed25519',
     '@qYeVniXyC0/D9GIlGMAiIKg5jGgJTY7ZEgeikRWIJ/Y=.ed25519',
     '@35wu1YDBx9NPsUXpe7bYmHb7BQFEfn2ZFh0DZ6OipA0=.ed25519' ],
  text: [ 'Hello, can I join?', 'Welcome!' ],
  addMember: [ '%JT31YmU0kuWg82UeZWy6YtAMbEcGouXVLU9JtO0MgcY=.sha256' ]
}
```

### `ssb.tribes.application.list(opts, cb)`

Returns a list with all group applications.

where:
- `opts` *Object*:
  - `groupId` *String*: filter applications for a specific group
  - `accepted` *Boolean*: filter applications that have been accepted or not

### `ssb.tribes.application.accept(applicationId, opts, cb)`

This runs `ssb.tribes.invite` to invite the person to the group, then publishes an update to the application linking to that message.

where:
- `opts` *Object*:
  - `text` *String*: A text to be viewed by the applicant

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


### `ssb.tribes.register(groupId, info, cb)`

Registers a new group that you have learnt about.

_NOTE: mainly used internally_

where:
- `groupId` *String* - is a cloaked group id (see `private-group-spec/group-id/README.md`)
- `info` *Object* - contains data of form `{ key, scheme }` where:
  - `key` *String* - a 32 byte symmetric key for the group (as a `base64` encoded string)
  - `scheme` *String* (optional) - a description of the key management scheme this key is part of
- `cb`[ *Function* - a callback with signature `cb(err: Error, success: Boolean)`



### `ssb.tribes.registerAuthors(groupId, [authorId], cb)`

Makes an off-log note that some author(s) are part of a group.
This is used to know which group keys to consider when you receive a private message from a particular author.

_NOTE: mainly used internally_

where:
- `groupId` *String* - is a the id for the group you want to not these users are part of
- `[authorId]` - *Array* is a connection of feedIds
- `cb` *Function* - has signature `cb(err, success)`


### `ssb.tribes.link.create({ group, name }, cb)`

Creates a message of type `link/feed-group` which links your feedId to a valid group. (i.e. you can only create links between your feedId and profiles at the moment)

Arguments:
- `group` *GroupId* - the id of the private group you're creating a link with (linking your scuttlebutt feed with that group)
- `name` *String* (optional) - this adds your nickname for the group
- `cb` *Function* - callback with signature `(err, link)` where `link` is the link message

Note:
- this link will be encrypted to the group you're linking to (i.e. link will have `recps: [groupId]`)

### `ssb.tribes.findByfeedId(feedId, cb)`

where:
- `feedId` *FeedId* is a string
- `cb` *function* is a callback with signature `cb(err, data)` where `data` is an array of items of form:
  ```
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

NOTE: the strange format of the data is to leave easy support for multiple editors in the future

### `ssb.tribes.list(cb)`

Returns a list of all known group IDs.

### `ssb.tribes.get(groupID, cb)`

Returns group metadata for a given group:

- `key`
- `root`
- `scheme`

## TODO

- [ ] add the latest known "sequence" at time of add-member, so we know if we need to reindex!

