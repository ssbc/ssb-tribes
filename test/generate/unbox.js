const { FeedId, MsgId } = require('../../lib/cipherlinks')
const { GroupId, GroupKey, Server, print } = require('../helpers')
const SCHEMES = require('private-group-spec/key-schemes.json').scheme

// TODO add test case for previous: null

const generators = [
  (i) => {
    const description = 'open envelope (group_keys + previous === null)'
    const server = Server()

    const groupKey = GroupKey()
    const groupId = GroupId()

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
          description,
          input: {
            msgs: [msg],
            trial_keys: [
              { key: GroupKey().toString('base64'), scheme: SCHEMES.private_group },
              { key: groupKey,                      scheme: SCHEMES.private_group }
            ]
          },
          output: {
            msgsContent: [content]
          }
        }
        print(`vectors/unbox${i + 1}.json`, vector)
      })
    })
  },

  (i) => {
    const description = 'open envelope (group_keys + previous !== null)'
    const server = Server()

    const content1 = { type: 'first' }

    server.publish(content1, (err, firstMsg) => {
      const groupKey = GroupKey()
      const groupId = GroupId()

      server.private2.group.add(groupId, { key: groupKey }, (_, success) => {
        const content2 = {
          type: 'alert',
          text: 'get ready to scuttle!',
          recps: [groupId]
        }

        server.publish(content2, (err, msg) => {
          if (err) throw err

          server.close()

          const vector = {
            type: 'unbox',
            description,
            input: {
              msgs: [firstMsg, msg],
              trial_keys: [
                { key: GroupKey().toString('base64'), scheme: SCHEMES.private_group },
                { key: groupKey,                      scheme: SCHEMES.private_group }
              ]
            },
            output: {
              msgsContent: [content1, content2]
            }
          }
          print(`vectors/unbox${i + 1}.json`, vector)
        })
      })
    })
  }
]

generators.forEach((fn, i) => fn(i))
