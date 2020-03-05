const test = require('tape')
const pull = require('pull-stream')
const { decodeLeaves, GroupId, Server } = require('./helpers')

const vectors = [
  require('private-group-spec/vectors/unbox1.json'),
  require('private-group-spec/vectors/unbox2.json')
].map(decodeLeaves)


// NOTE - this is being run more like an integration test
// this is because current the "unbox" functionality is quite coupled with other functions in index.js.
// In future this could be extracted, but for now I'm happy with this test (mix)

test('unbox', t => {
  t.plan(vectors.length)

  vectors.forEach(vector => {
    const { msgs, trial_keys } = vector.input

    const server = Server()
    const authorIds = [ msgs[0].value.author ]

    pull(
      /* add keys to keystore for msg author */
      /* this is so we can use unboxing code in index.js */
      pull.values(trial_keys),
      pull.asyncMap(({ key }, done) => {
        const groupId = GroupId() // doesn't matter

        server.private2.group.add(groupId, { key }, (_, data) => {
          server.private2.group.addAuthors(groupId, authorIds, done)
        })
      }),
      pull.collect((err) => {
        if (err) throw err


        pull(
          /* add messages to our log */
          pull.values(msgs),
          pull.asyncMap((msg, cb) => server.add(msg.value, cb)),
          pull.collect((err, msgs) => {
            if (err) throw err

            /* look up the messages asking for auto-decrypt */
            /* this will pull the keys we added, and hopefully decrypt correctly */
            pull(
              pull.values(msgs.map(m => m.key)),
              pull.asyncMap((id, cb) => server.get({ id, private: true }, cb)),
              pull.map(value => value.content),
              pull.collect((err, msgContents) => {
                t.deepEqual(msgContents, vector.output.msgsContent, vector.description)

                server.close()
              })
            )
          })
        )
      })
    )

  })
})
