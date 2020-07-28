const test = require('tape')
const { Server } = require('../../helpers')
const pull = require('pull-stream')

const text1 = 'Hello, can I join?'
const text2 = 'Welcome!'
const text3 = 'Welcome for a second time!'

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
        text1,
        (applicationErr, applicationData) => {
          t.error(applicationErr)
          t.equal(typeof applicationData, 'object')
          t.equal(typeof applicationData.root, 'string')
          t.equal(typeof applicationData, 'object')
          t.equal(typeof applicationData.tangles, 'object')
          /* Kaitiaki lists group applications for a group */
          kaitiaki.tribes.application.list(
            groupData.groupId,
            false,
            (listErr, listData) => {
              /* Kaitiaki accepts the application */
              t.error(listErr)
              kaitiaki.tribes.application.accept(
                listData[0].root,
                text2,
                (acceptErr, acceptData) => {
                  t.equal(typeof acceptData, 'object')
                  t.error(acceptErr)
                  /* User checks the current application state */
                  server.tribes.application.get(
                    applicationData.root,
                    (getError, getData) => {
                      t.error(getError)
                      /* User lists the tribes it's a part of */
                      server.tribes.list((tribesListErr, tribesListData) => {
                        t.error(tribesListErr)
                        t.equal(tribesListData.length, 1)
                        /* Kaitiaki creates a second accept message */
                        kaitiaki.tribes.application.accept(
                          listData[0].root,
                          text3,
                          (acceptErr2, acceptData2) => {
                            t.error(acceptErr2)
                            /* Kaitiaki checks list of applications */
                            kaitiaki.tribes.application.list(
                              null,
                              null,
                              (upListErr, upListData) => {
                                t.error(upListErr)
                                t.deepEqual(upListData[0].text, [
                                  text1,
                                  text2,
                                  text3
                                ])
                                kaitiaki.close()
                                server.close()
                                t.end()
                              }
                            )
                          }
                        )
                      })
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
