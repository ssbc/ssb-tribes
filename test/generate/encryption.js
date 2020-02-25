const { FeedId, MsgId, GroupId } = require('../../lib/cipherlinks')
const { GroupKey, print } = require('../helpers')
const Server = require('../server')

const generators = [
  (i) => {
    const server = Server()

    const initMsgId = new MsgId().mock()
    const groupKey = GroupKey()
    const groupId = new GroupId(initMsgId.toTFK(), groupKey).toSSB()

    // TODO put some wait queue on group.add, which waits for "ready" to be called
    // maybe this is in the keystore?
    // I think problem is the init happens which over-writes state ):
    setTimeout(() => {
      server.private2.group.add(groupId, { key: groupKey }, (_, success) => {
        const content = {
          type: 'alert',
          text: 'get ready to scuttle!',
          recps: [groupId]
        }

        server.publish(content, (err, msg) => {
          if (err) throw err

          server.close()

          const vector = {
            type: 'unbox',
            description: 'unbox this message!',
            input: {
              msg,
              trial_keys: [
                GroupKey().toString('base64'),
                groupKey
              ]
            },
            output: {
              content
            }
          }
          print(`encryption/vector${i + 1}.json`, vector)
        })
      })
    }, 1e3)
  }
]

generators.forEach((fn, i) => fn(i))
