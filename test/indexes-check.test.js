// we were seeing weird behaviour in ssb-backlinks
// this test is designed to pin that down

const test = require('tape')
const pull = require('pull-stream')

const { Server } = require('./helpers')

const PROFILE = 'profile/person'
const LINK = 'link/feed-profile'

function createRecords (server, t, cb) {
  // this function creates a group and published a handful of messages to that group
  // it calls back with the groupId and the list of published messages

  /* state */
  const published = [] // contents of messages we published
  let lastMsgId

  server.tribes.create({}, (err, { groupId } = {}) => {
    t.error(err, 'creates group')

    const recps = [groupId]
    // recps = null // passes all tests

    let count = 0
    pull(
      pull.values([PROFILE, LINK, PROFILE, LINK]),
      // pull.values([PROFILE, LINK, PROFILE, LINK, PROFILE]), // ✓ checkIndex
      // pull.values([PROFILE, LINK, PROFILE, LINK, LINK]), // x checkIndex
      pull.map(type => {
        return (type === PROFILE)
          ? { type, count: count++, recps }
          : { type, count: count++, parent: server.id, child: lastMsgId, recps }
      }),
      pull.asyncMap((content, cb) => {
        server.publish(content, (err, msg) => {
          if (err) return cb(err)
          const label = typeof msg.value.content === 'string' ? 'encrypted' : 'public'
          t.ok(true, `${label} (${content.count}, ${content.type})`)
          lastMsgId = msg.key
          published.push(content)
          cb(null, msg)
        })
      }),
      pull.collect((err) => {
        t.error(err, 'all published')

        cb(null, { groupId, published })
      })
    )
  })
}

function testSuite (indexName, createSource) {
  function checkIndex (server, t, published, cb) {
    pull(
      createSource(server),
      pull.collect((err, results) => {
        t.error(err, `${indexName}.read`)

        const _published = published.filter(i => i.type === LINK)
        // t.equal(_published.length, results.length, 'finds all messages')

        const outputs = results.map(m => m.value.content)

        _published.forEach((link, i) => {
          t.deepEqual(outputs[i], link, `${indexName} finds (${link.count}, ${link.type})`)
        })
        cb(null)
      })
    )
  }

  test(indexName, t => {
    const name = `${indexName}-be-good-${Date.now()}`
    let server = Server({ name })
    const keys = server.keys

    createRecords(server, t, (_, { groupId, published }) => {
      t.comment(`> check ${indexName} results`)
      checkIndex(server, t, published, () => {
        t.comment('> check again (after server restart)')
        server.close(err => {
          if (err) throw err
          server = Server({ name, keys, startUnclean: true })
          t.ok(server.whoami(), 'server restart')

          checkIndex(server, t, published, () => {
            t.comment('> check AGAIN (after a publish + restart)')
            const anything = {
              type: 'doop',
              recps: [groupId]
            }
            server.publish(anything, (err) => {
              t.error(err, 'publish anything')
              const keys = server.keys
              server.close(err => {
                if (err) throw err
                server = Server({ name, keys, startUnclean: true })
                t.ok(server.whoami(), 'server restart')

                checkIndex(server, t, published, () => {
                  server.close(t.end)
                })
              })
            })
          })
        })
      })
    })
  })
}

testSuite('backlinks', (server) => {
  const query = [{
    $filter: {
      dest: server.id,
      value: {
        content: {
          type: LINK,
          parent: server.id
        }
      }
    }
  }]

  return server.backlinks.read({ query })
})

testSuite('query', (server) => {
  const query = [{
    $filter: {
      value: {
        author: server.id,
        content: {
          type: LINK,
          parent: server.id
        }
      }
    }
  }]

  return server.query.read({ query })
})
