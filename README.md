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
ssb.tribes.create({}, (err, info) => {
  const { groupId } = info

  const content = {
    type: 'post',
    test: 'kia ora, e te whānau',
    recps: [groupId] // <<< you can now put a groupId in the recps
  }
  ssb.publish(content, (err, msg) => {
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

1. **When you publish a message with `recps` it will auto-encrypt** the content when:
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
- `ssb-db` >= 20.3.0
- `ssb-tribes`
- `ssb-backlinks` >= 2.1.1 - used for adding group tangle meta data to messages + loading applications

- `ssb-replicate` - (optional) used to auto-replicate people who you're in groups with
- `ssb-query` >= 2.4.5 - (optional) used for listing applications

## API

### `ssb.tribes.create(opts, cb)`

Mint a new private group.

where:
- `opts` *Object* (currently no opts you can pass in but empty object still required)
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

### `ssb.tribes.list(cb)`

Returns a list of all known group IDs.

### `ssb.tribes.get(groupID, cb)`

Returns group metadata for a given group:

- `key` - the decryption key for the group
- `scheme` - the scheme the key is associated with (e.g. DM, group)
- `root` - the initial message which started the group

### `ssb.tribes.listAuthors(groupId, cb)`

Lists all the authors (feedIds) who you know are part of the group with id `groupId`


---

## API (Extras)

These endpoints give you access to additional features, such as:
- **manually registering groups or authors**:
    - `ssb.tribes.register(groupId, info, cb)`
    - `ssb.tribes.registerAuthors(groupId, [authorId], cb)`
- **binding groups to feeds**
    - `ssb.tribes.link.create({ group, name }, cb)`
    - `ssb.tribes.findByFeedId(feedId, cb)`
- **managing people applying to join to a group**
    - `ssb.tribes.application.create(groupdId, groupAdmins, opts, cb)`
    - `ssb.tribes.application.get(applicationId, cb)`
    - `ssb.tribes.application.comment(applicationId, comment, cb)`
    - `ssb.tribes.application.accept(applicationId, opts, cb)`
    - `ssb.tribes.application.reject(applicationId, opts, cb)`
    - `ssb.tribes.application.list(cb)`

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

### `ssb.tribes.application.create(groupdId, groupAdmins, opts, cb)`

Creates a tribe application message directed to the administrators of a private-group.

where:

- `groupAdmins` *[FeedId]* is an array of the admins you are sending your application to
- `opts` *Object*:
  - `answers` *Array*: A collection of questions and their answers of form `[{ q: String, a: String }, ...]`
  - `comment` *String*: A text to be viewed by the Kaitiakis of a group
  - `profileId` *String*: is the id of a profile containing the applicants details. Note, if this profile is encrypted, it should be encrypted so `groupAdmins` can read it
  > These are optional and can be left out using: `ssb.tribes.application.create(groupId, groupAdmins, cb)` if no opts are needed

### `ssb.tribes.application.accept(applicationId, opts, cb)`

This runs `ssb.tribes.invite` to invite the person to the group, then publishes an update to the application linking to that message.

where:
- `opts` *Object*:
  - `applicationComment` *String*: a message to be viewed in the application thread along with the acceptant
  - `groupIntro` *String*: a message that will be published along with the `group/add-member` message

### `ssb.tribes.application.reject(applicationId, opts, cb)`

where:
- `opts` *Object*:
  - `reason` *String*: a message to be viewed in the application thread along with the rejection

### `ssb.tribes.application.get(applicationId, cb)`

Returns the current state of a tribe application. e.g.

```js
{
  id: '%CXVDe5AoPVf83CoHYBpfplpzTU/YYkN56yge1nBG9wE=.sha256',
  groupId: '%A9OUzXtv7BhaAfSMqBzOO6JC8kvwmZWGVxHDAlM+/so=.cloaked',
  applicantId: '@35wu1YDBx9NPsUXpe7bYmHb7BQFEfn2ZFh0DZ6OipA0=.ed25519',
  profileId: '%FiR41bB1CrsanZA3VgAzoMmHEOl8ZNXWn+GS5vW3E/8=.sha256',
  groupAdmins: [
    '@CQi7RZDHLHalHErknddXIczj6FulnAdbYfULVSXTbns=.ed25519',
    '@qYeVniXyC0/D9GIlGMAiIKg5jGgJTY7ZEgeikRWIJ/Y=.ed25519',
  ],
  
  answers: [
    {
      q: 'where are you from?',
      a: 'I was born in Hawkes Bay'
    }
  ],
  decision: {
    accepted: true,
    addMember: '%pfplpzTU/YYkN56yge1CXVDe5AoPVf83CoHYBnBG9wE=.sha256'
    // link to message which added them to group
  },
  history: [
    {
      type: 'answers',
      author: '@35wu1YDBx9NPsUXpe7bYmHb7BQFEfn2ZFh0DZ6OipA0=.ed25519', // applicationId
      timestamp: 1613003009958,
      body: [
        {
          q: 'where are you from?',
          a: 'I was born in Hawkes Bay'
        }
      ]
    },
    {
      type: 'comment',
      author: kaitiaki.id,
      timestamp: 1613003010973,
      body: 'WELCOME!'
    },
    {
      type: 'decision',
      author: '@CQi7RZDHLHalHErknddXIczj6FulnAdbYfULVSXTbns=.ed25519', // groupAdmins[0]
      timestamp: 1613003010973,
      body: {
       accepted: true,
       addMember: '%pfplpzTU/YYkN56yge1CXVDe5AoPVf83CoHYBnBG9wE=.sha256'
      }
    }
  ]
}
```

NOTE:
- `groupAdmins` are the people the applicant have sent their application to
- if two decisions are concurrently posted by two different admins, the `decision` field shows:
  - the latest acceptance decision
  - OR if there's been no acceptance the latest rejection (by authored timestamp)

### `ssb.tribes.application.list(cb)`

where `cb` calls back with an Array of application ids.

Alternatively, you can call with opts `ssb.tribes.application.list(opts, cb)`
where `opts` *Object* with properties:
  - `groupId` *MessagedId*: return only application for a specific group
  - `get` *Function | true* - runs an async function on each applicationId before calling back. If `true` is passed, this is the internal `ssb.tribes.application.get`.
  - `accepted` *(Boolean|null)*: filter applications that have been accepted or not.
    - `accepted: true` gets you applications which have been accepted
    - `accepted: false` gets you applications which have been rejected
    - `accepted: null` gets you applications which haven't had a decision made on them yet
    - If you set this, you get full application records back



## TODO

- [ ] add the latest known "sequence" at time of add-member, so we know if we need to reindex!
- [ ] more tests around applications which have multiple decisions made on them

