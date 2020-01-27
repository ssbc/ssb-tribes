# ssb-private2

Introduces the box2 encryption to scuttlebutt.

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
    <FeedId>,
    <GroupId>
  }
}
ssb.publish(content, (err, data) => {
})
```

Later, any of the following will result in a happiliy readable message (for you and those who share the `GroupKey`):
- you use `server.get(msgKey, { private: true }, cb)`
- you run any db query which might have matched that message

**NOTE**:
- `<FeedId>` is synonymous with the public key of a particular device (`@...sha256`)
- `<GroupId>` is a unique identifier which can be mapped to the `<GroupKey>` for that Group. The importance of these being distinct is that a `<GroupId>` is designed to leak no information about who is in the group, and is therefore safe to reference in public contexts.

## Requirements

A Secret-Stack server running the plugins `ssb-db` and `ssb-private2`

## API

### `ssb.private2.keys.add({ groupId, groupKey }, cb)`

where 
- `groupId` *String* - ... TODO
- `groupKey` *String* - a 32 byte symmetric key that as a `base64` encoded string
- `cb`[ *Function* - a callback with signature `cb(err: Error, success: Boolean)`

### `ssb.private2.keys.list(cb)`

calls back with an object with keys and values:

```js
{
  <GroupId>: <GroupKey>
}
```

### `ssb.private2.keys.remove(groupId, cb)`

where cb has signature `cb(err: Error, success: Boolean)`

