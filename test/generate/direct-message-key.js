const { DHFeedKeys, print } = require('../helpers')
const directMessageKey = require('../../lib/direct-message-key')

const generators = [
  (i) => {
    const my = DHFeedKeys()
    const your = DHFeedKeys()

    const sharedKey = directMessageKey(my.dh.secret, my.dh.public, my.feed.tfk, your.dh.public, your.feed.tfk)

    const vector = {
      type: 'direct_message_shared_key',
      description: 'calculate a shared DM key for another feedID',
      input: {
        my_dh_secret: my.dh.secret,
        my_dh_public: my.dh.public,
        my_feed_tfk: my.feed.tfk,

        your_dh_public: your.dh.public,
        your_feed_tfk: your.feed.tfk
      },
      output: {
        shared_key: sharedKey
      }
    }
    print(`vectors/direct-message-key${i + 1}.json`, vector)
  }
]

generators.forEach((fn, i) => fn(i))
