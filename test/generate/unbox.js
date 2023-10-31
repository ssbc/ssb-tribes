const { keySchemes } = require('private-group-spec')

const { GroupId, GroupKey, Server, print, MsgId } = require('../helpers')
// const FeedKeys = require('../../lib/feed-keys')
// const directMessageKey = require('../../lib/direct-message-key')

const generators = [
  (i) => {
    const description = 'open envelope (group_keys + previous === null)'
    const server = Server()

    const groupId = GroupId()
    const groupKey = GroupKey()
    const root = MsgId()

    server.tribes.register(groupId, { key: groupKey, root }, (_, success) => {
      const content = {
        type: 'alert',
        text: 'get ready to scuttle!',
        recps: [groupId]
      }

      server.tribes.publish(content, (err, msg) => {
        if (err) throw err

        server.close()

        const vector = {
          type: 'unbox',
          description,
          input: {
            msgs: [msg],
            trial_keys: [
              { key: GroupKey().toString('base64'), scheme: keySchemes.private_group },
              { key: groupKey, scheme: keySchemes.private_group }
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

    server.tribes.publish(content1, (_, firstMsg) => {
      const groupId = GroupId()
      const groupKey = GroupKey()
      const root = MsgId()

      server.tribes.register(groupId, { key: groupKey, root }, (_, success) => {
        const content2 = {
          type: 'alert',
          text: 'get ready to scuttle!',
          recps: [groupId]
        }

        server.tribes.publish(content2, (err, msg) => {
          if (err) throw err

          server.close()

          const vector = {
            type: 'unbox',
            description,
            input: {
              msgs: [msg],
              trial_keys: [
                { key: GroupKey().toString('base64'), scheme: keySchemes.private_group },
                { key: groupKey, scheme: keySchemes.private_group }
              ]
            },
            output: {
              msgsContent: [content2]
            }
          }
          print(`vectors/unbox${i + 1}.json`, vector)
        })
      })
    })
  }

  // NOTE not sure this is needed as we have direct-message-key vectors

  /*
  (i) => {
    const description = 'open envelope (dm-shared key based on feedId)'
    const server = Server()

    const content1 = {
      type: 'push',
      body: { tick: Date.now() }
    }

    server.tribes.publish(content1, (_, firstMsg) => {
      const groupId = GroupId()
      const groupKey = GroupKey()
      const root = MsgId()

      server.tribes.register(groupId, { key: groupKey, root }, (_, success) => {
        const friendId = new FeedId().mock()

        const content2 = {
          type: 'push',
          body: { tick: Date.now() },
          recps: [groupId, friendId.toSSB()]
        }

        server.tribes.publish(content2, (err, msg) => {
          if (err) throw err

          const key = directMessageKey.easy(server.keys)(friendId.toSSB())

          server.close()

          const vector = {
            type: 'unbox',
            description,
            input: {
              msgs: [firstMsg, msg],
              trial_keys: [
                { key, scheme: keySchemes.feed_id_dm }
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
  */
]

generators
  // .slice(2, 3)
  .forEach((fn, i) => fn(i))
