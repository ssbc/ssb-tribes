const test = require('tape')
const { Server } = require('../../helpers')
const pull = require('pull-stream')

test('tribes.application.create', t => {
  const kaitiaki = Server({ name: 'createGroup' })
  const server = Server({ name: 'createApplication' })

  pull(
    server.createUserStream({ id: server.id, live: true }),
    pull.filter(m => !m.sync),
    pull.drain(m => {
      kaitiaki.add(m.value, err => {
        if (err) throw err
      })
    })
  )

  pull(
    kaitiaki.createUserStream({ id: kaitiaki.id, live: true }),
    pull.filter(m => !m.sync),
    pull.drain(m => {
      server.add(m.value, err => {
        if (err) throw err
      })
    })
  )

  /* Kaitiaki creates a group */
  kaitiaki.tribes.create('the pantheon', (groupErr, groupData) => {
    t.error(groupErr)
    const recps = [kaitiaki.id, server.id]
    /* User lists tribes it's part off */
    server.tribes.list((intialErr, initialList) => {
      t.error(intialErr)
      t.equal(initialList.length, 0)
      /* User creates an application to join group */
      server.tribes.application.create(
        groupData.groupId,
        recps,
        'Hello, can I join?',
        (applicationErr, applicationData) => {
          t.error(applicationErr)

          t.equal(typeof applicationData, 'object')
          t.equal(typeof applicationData.key, 'string')
          t.equal(typeof applicationData.content, 'object')
          t.equal(typeof applicationData.content.tangles, 'object')
          /* Kaitiaki lists group applications for a group */
          kaitiaki.tribes.application.list(
            groupData.groupId,
            (listErr, listData) => {
              /* Kaitiaki accepts the application */
              kaitiaki.tribes.application.accept(
                listData[0].key,
                'Welcome!',
                (acceptErr, acceptData) => {
                  t.equal(typeof acceptData, 'object')
                  t.error(acceptErr)
                  /* User checks the current application state */
                  server.tribes.application.get(
                    applicationData.key,
                    (getError, getData) => {
                      console.log('getData', getData)
                      console.log('getData CONTENT', getData.value.content)
                      console.log(
                        'getData TANGLES',
                        getData.value.content.tangles
                      )
                      t.error(getError)
                      server.tribes.list((listErr, listData) => {
                        t.error(listErr)
                        t.equal(listData.length, 1)
                        kaitiaki.close()
                        server.close()
                        t.end()
                      })
                      // const expected = {
                      //   type: 'group/application',
                      //   version: 'v1',
                      //   recps,
                      //   tangles: {
                      //     application: {
                      //       root: applicationData.value.previous,
                      //       previous: [applicationData.value.previous]
                      //     }
                      //   }
                      // }
                      // t.deepEqual(
                      //   getData.content,
                      //   expected,
                      //   'create and get group application'
                      // )
                    }
                  )
                }
              )
            }
          )
        }
      )
    })
  })
})
