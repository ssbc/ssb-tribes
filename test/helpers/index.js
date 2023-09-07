const { SecretKey } = require('ssb-private-group-keys')
const { replicate } = require('scuttle-testbot')
const test = require('tape')
const { promisify: p } = require('util')

const { FeedId, POBoxId, MsgId } = require('./cipherlinks')
const decodeLeaves = require('./decode-leaves')
const encodeLeaves = require('./encode-leaves')
const DHFeedKeys = require('./dh-feed-keys')
const print = require('./print')
const Server = require('./test-bot')

module.exports = {
  GroupId: () => `%${new SecretKey().toString()}.cloaked`,
  GroupKey: () => new SecretKey().toBuffer(),
  FeedId: () => new FeedId().mock().toSSB(),
  POBoxId: () => new POBoxId().mock().toSSB(),
  MsgId: () => new MsgId().mock().toSSB(),
  DHFeedKeys,

  decodeLeaves,
  encodeLeaves,
  p,
  print,
  replicate,
  Run (t) {
    return function run (message, promise) {
      if (!promise.then) {
        t.pass(message)
        return promise
      }

      return promise
        .then(result => {
          t.pass(message)
          return result
        })
        .catch(err => {
          t.error(err, message)
        })
    }
  },
  Server,
  test
}
