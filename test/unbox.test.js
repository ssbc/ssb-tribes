/* eslint-disable camelcase */

const test = require('tape')
const pull = require('pull-stream')
const envelope = require('../envelope')
const { decodeLeaves, Server } = require('./helpers')

const vectors = [
  require('private-group-spec/vectors/unbox1.json'),
  require('private-group-spec/vectors/unbox2.json')
].map(decodeLeaves)

test('unbox', t => {
  t.plan(vectors.length)

  vectors.forEach(vector => {
    const { msgs, trial_keys } = vector.input

    const keystore = {
      author: {
        groupKeys: () => trial_keys
      }
    }
    // mock out the keystore
    const { unboxer } = envelope(keystore, {})
    const ciphertext = msgs[0].value.content

    const read_key = unboxer.key(ciphertext, msgs[0].value)
    const body = unboxer.value(ciphertext, msgs[0].value, read_key)
    t.deepEqual(body, vector.output.msgsContent[0], vector.description)
  })
})

test('unbox (indexes can access)', t => {
  const server = Server()

  server.tribes.create(null, (err, data) => {
    if (err) throw err

    const { groupId, groupInitMsg } = data

    const content = {
      type: 'group/settings',
      name: { set: 'waynes world' },
      tangles: {
        group: {
          root: groupInitMsg.key,
          previous: [groupInitMsg.key]
        }
      },
      recps: [groupId]
    }

    server.publish(content, (err, msg) => {
      if (err) throw err

      t.true(msg.value.content.endsWith('.box2'), 'publishes envelope cipherstring')

      const query = [{
        $filter: { dest: groupInitMsg.key }
      }]
      pull(
        server.backlinks.read({ query }),
        pull.collect((err, msgs) => {
          t.error(err)
          t.deepEqual(msgs[0].value.content, content, 'private message accessible in index!')

          server.close()
          t.end()
        })
      )
    })
  })
})
