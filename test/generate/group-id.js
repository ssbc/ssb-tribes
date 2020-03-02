const { box } = require('@envelope/js')
const SCHEMES = require('private-group-spec/key-schemes.json').scheme

const { FeedId, MsgId } = require('../../lib/cipherlinks')
const groupId = require('../../lib/group-id')
const Secret = require('../../lib/secret-key')
const { print } = require('../helpers')
const Server = require('../server')

// TODO change this is to use cloaked-id from envelope-spec
// TODO extact this into "create group" method
const generators = [
  (i) => {
    const server = Server()

    server.publish({ type: 'first' }, (err, msg) => {
      const content = {
        type: 'group/init',
        name: { set: 'the 3 musketeers (travel planning)' },
        tangles: {
          group: { root: null, previous: null }
        }
      }
      const plain = Buffer.from(JSON.stringify(content), 'utf8')
      const feedId = new FeedId(server.id).toTFK()
      const previous = new MsgId(msg.key).toTFK()
      const msgKey = new Secret().toBuffer()
      const groupKey = new Secret().toBuffer()
      const recipientKeys = [
        { key: groupKey, scheme: SCHEMES.private_group }
      ]

      const envelope = box(plain, feedId, previous, msgKey, recipientKeys)
      const ciphertext = envelope.toString('base64') + '.box2'

      server.publish(ciphertext, (err, msg) => {
        server.close()

        const group_id = groupId(msg, msgKey)

        const vector = {
          type: 'group_id',
          description: 'determine the groupId',
          input: {
            group_init_msg: msg,
            group_key: groupKey
          },
          output: {
            group_id
          }
        }
        print(`vectors/group-id${i + 1}.json`, vector)
      })
    })
  }
]

generators.forEach((fn, i) => fn(i))
