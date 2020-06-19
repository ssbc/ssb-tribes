const { DHFeedKeys, print } = require('../helpers')
const directMessageKey = require('../../lib/direct-message-key')

const generators = [
  (i) => {
    const my = DHFeedKeys()
    const your = DHFeedKeys()

    const sharedKey = directMessageKey(my.dh.secret, my.dh.public, my.feedId, your.dh.public, your.feedId)

    const vector = {
      type: 'direct_message_shared_key',
      description: 'calculate a shared DM key for another feedID. Note all inputs here are TFK encoded!',
      input: {
        my_dh_secret: my.dh.secret,
        my_dh_public: my.dh.public,
        my_feed_id: my.feedId,

        your_dh_public: your.dh.public,
        your_feed_id: your.feedId
      },
      output: {
        shared_key: sharedKey
      }
    }
    print(`vectors/direct-message-key${i + 1}.json`, vector)
  }
]

generators.forEach((fn, i) => fn(i))
