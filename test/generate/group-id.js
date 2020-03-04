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

      server.private2.group.create('3 musketeers', (err, data) => {
        server.close()

        const vector = {
          type: 'group_id',
          description: 'determine the groupId',
          input: {
            group_key: data.groupKey,
            group_init_msg: data.groupInitMsg
          },
          output: {
            group_id: data.groupId
          }
        }
        print(`vectors/group-id${i + 1}.json`, vector)
      })
    })
  }
]

generators.forEach((fn, i) => fn(i))
