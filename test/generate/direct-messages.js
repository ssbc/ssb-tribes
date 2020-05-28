const keys = require('ssb-keys')
const { print } = require('../helpers')
const directMessageKey = require('../../lib/direct-message-key')

const generators = [
  (i) => {
    const myKeys = keys.generate()
    const yourKeys = keys.generate()

    const sk = Buffer.from(myKeys.private, 'base64')
    const pk = Buffer.from(yourKeys.public, 'base64')
    const sharedKey = directMessageKey(sk)(pk)

    const vector = {
      type: 'direct_message_shared_key',
      description: 'calculate a shared DM key for another feedID',
      input: {
        my_keys: myKeys,
        feed_id: yourKeys.id
      },
      output: {
        shared_key: sharedKey
      }
    }
    print(`vectors/direct-message-key${i + 1}.json`, vector)
  }
]

generators.forEach((fn, i) => fn(i))
