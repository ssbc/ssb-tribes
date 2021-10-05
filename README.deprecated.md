# API ─ Deprecated

These methods are currently still present, but using them is no longer advised.
They will likely be removed in a future major release.

For applying to join groups, please use [ssb-tribes-registration](https://gitlab.com/ahau/lib/ssb-plugins/ssb-tribes-registration)


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

### `ssb.tribes.application.update(applicationId, opts, cb)`
### `ssb.tribes.application.tombstone(applicationId, opts, cb)`

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

