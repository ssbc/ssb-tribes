const test = require('tape')
const { Server } = require('../../helpers')
const pull = require('pull-stream')
const { isMsg } = require('ssb-ref')

const text1 = 'Hello, can I join?'
const text2 = 'Welcome!'
const text3 = 'Welcome for a second time!'

test('tribes.application.*', t => {
  const kaitiaki = Server({ name: 'createGroup' })
  const stranger = Server({ name: 'createApplication' })

  pull(
    stranger.createUserStream({ id: stranger.id, live: true }),
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
      stranger.add(m.value, err => {
        if (err) throw err
      })
    })
  )

  var applicationId

  /* Kaitiaki creates a group */
  kaitiaki.tribes.create('the pantheon', (err, { groupId } = {}) => {
    t.error(err, 'kaitiaki creates group')

    /* User lists tribes it's part of */
    stranger.tribes.list((err, initialList) => {
      t.error(err, 'tribes.list works')
      t.equal(initialList.length, 0, 'tribes.list shows stranger is not part of group')

      /* User creates an application to join group */
      const admins = [kaitiaki.id]
      stranger.tribes.application.create(groupId, admins, { text: text1 }, (err, applicationData) => {
        t.error(err, 'creates application')

        applicationId = applicationData.id

        t.true(isMsg(applicationData.id), 'application has an id')
        t.deepEqual(
          applicationData.comments[0],
          { author: stranger.id, text: text1 },
          'application has initial comment'
        )

        /* Kaitiaki lists group applications for a group */
        kaitiaki.tribes.application.list({ groupId, accepted: false }, (listErr, listData) => {
          t.error(listErr, 'kaitiaki can call up application')
          t.equal(listData[0].id, applicationId, 'kaitiaki can see same application')

          /* Kaitiaki accepts the application */
          kaitiaki.tribes.application.accept(listData[0].id, { text: text2 }, (err, acceptData) => {
            t.error(err, 'kaitiaki accepts')
            t.equal(acceptData.addMember.length, 1, 'group/add-member message sent')

            /* User checks the current application state */
            stranger.tribes.application.get(applicationData.id, (err, getData) => {
              t.error(err, 'stranger checks current state of application')
              t.deepEqual(
                getData.comments[1],
                { author: kaitiaki.id, text: text2 },
                'can see comment from kaitiaki'
              )
              t.equal(acceptData.addMember.length, 1, 'can see have been invited')

              /* User can now publish to group */
              stranger.publish({ type: 'hooray', recps: [groupId] }, (err) => {
                t.error(err, 'stranger is now part of group and can publish to it!')

                /* Kaitiaki creates a second accept message */
                kaitiaki.tribes.application.accept(listData[0].id, { text: text3 }, (err, acceptData2) => {
                  t.error(err, 'second acceptance')

                  /* Kaitiaki checks list of applications */
                  kaitiaki.tribes.application.list({}, (err, upListData) => {
                    t.error(err, 'kaitiaki check all applications')

                    t.deepEqual(upListData[0].comments, [
                      { author: stranger.id, text: text1 },
                      { author: kaitiaki.id, text: text2 },
                      { author: kaitiaki.id, text: text3 }
                    ], 'kaitiaki sees all comments')
                    kaitiaki.close()
                    stranger.close()
                    t.end()
                  })
                })
              })
            })
          })
        })
      })
    })
  })
})
