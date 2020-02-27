const { FeedId, MsgId, GroupId } = require('../../lib/cipherlinks')
const { GroupKey, print } = require('../helpers')
const Server = require('../server')
const SCHEMES = require('private-group-spec/key-schemes.json').scheme

const generators = [
  (i) => {
    const server = Server()

    const initMsgId = new MsgId().mock()
    const groupKey = GroupKey()
    const groupId = new GroupId(initMsgId.toTFK(), groupKey).toSSB()

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
          description: 'unbox this message! (Note it has previous: null)',
          input: {
            msg,
            trial_keys: [
              { key: GroupKey().toString('base64'), scheme: SCHEMES.feed_id_dm },
              { key: groupKey, scheme: SCHEMES.private_group }
            ]
          },
          output: {
            content
          }
        }
        print(`unbox${i + 1}.json`, vector)
      })
    })
  }
]

generators.forEach((fn, i) => fn(i))
