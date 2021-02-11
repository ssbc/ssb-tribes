const Crut = require('ssb-crut')
const pull = require('pull-stream')
const paraMap = require('pull-paramap')
const { isCloakedMsg: isGroup } = require('ssb-ref')
const spec = require('../spec/application.js')

module.exports = function Application (ssb) {
  const crut = new Crut(ssb, spec)

  function pruneInput (input) {
    delete input.groupId
    delete input.version
    delete input.history

    return input
  }

  return {
    create (groupId, adminIds, input = {}, cb) {
      crut.create({
        groupId,
        version: 'v2',
        ...pruneInput(input),

        recps: [...adminIds, ssb.id]
      }, cb)
    },
    read (applicationId, cb) {
      crut.read(applicationId, (err, application) => {
        if (err) return cb(err)

        cb(null, {
          id: applicationId,
          groupId: application.groupId,
          applicantId: application.originalAuthor,
          groupAdmins: application.recps.filter(a => a !== application.originalAuthor),

          answers: application.states[0].answers,
          decision: application.states[0].decision,

          history: application.states[0].history
        })
      })
    },

    /* update */
    update (applicationId, input, cb) {
      crut.update(applicationId, pruneInput(input), cb)
    },
    comment (applicationId, comment, cb) {
      crut.update(applicationId, { comment }, cb)
    },
    accept (applicationId, opts = {}, cb) {
      const {
        applicationComment,
        groupIntro = ''
      } = opts

      ssb.tribes.application.read(applicationId, (err, application) => {
        if (err) return cb(err)

        const { groupId, applicantId } = application

        ssb.tribes.invite(groupId, [applicantId], { text: groupIntro }, (err, invite) => {
          if (err) return cb(err)

          const input = {
            decision: {
              approved: true,
              addMember: invite.key
            }
          }
          if (applicationComment) input.comment = applicationComment

          crut.update(applicationId, input, cb)
        })
      })
    },
    reject (applicationId, reason = '', cb) {
      const input = {
        decision: { approved: false }
      }
      if (reason && reason.length) input.comment = reason
      crut.update(applicationId, input, cb)
    },

    list (opts, cb) {
      GroupApplicationList(ssb)(opts, cb)
    }
  }
}

function GroupApplicationList (server) {
  return function groupApplicationList (opts, cb) {
    if (typeof opts === 'function') return groupApplicationList({}, cb)

    if (opts.get === true) opts.get = server.tribes.application.read
    const optsError = findOptsError(opts)
    if (optsError) return cb(optsError)

    const { groupId, get, accepted } = opts
    const queryGroupId = [
      {
        $filter: {
          value: {
            content: {
              type: 'group/application',
              groupId,
              tangles: {
                application: {
                  root: null
                }
              }
            }
          }
        }
      }
    ]
    const queryAll = [
      {
        $filter: {
          value: {
            content: {
              type: 'group/application',
              tangles: {
                application: {
                  root: null
                }
              }
            }
          }
        }
      }
    ]

    const query = groupId ? queryGroupId : queryAll

    pull(
      server.query.read({ query }),
      pull.map(i => i.key),

      // (optionally) convert applicationIds into application records
      (get !== undefined)
        ? paraMap(get, 4) // 4 = width of parallel querying
        : null,

      // (optionally) filter applications by whether accepted
      (accepted !== undefined)
        ? pull.filter(i => {
            if (accepted === true) return i.addMember && i.addMember.length
            if (accepted === false) return !i.addMember || i.addMember.length === 0
            throw new Error('accepted must be a Boolean')
          })
        : null,

      pull.collect((err, data) => {
        cb(err, data)
      })
    )
  }
}

function findOptsError ({ groupId, get, accepted }) {
  const head = 'tribes.application.list expected '
  if (groupId && !isGroup(groupId)) {
    return new Error(`${head} "groupId" to be (undefined | GroupId}, got ${groupId}`)
  }
  if (get && typeof get !== 'function') {
    return new Error(`${head} "get" to be (Function), got ${typeof get}`)
  }
  if (accepted !== undefined) {
    if (typeof accepted !== 'boolean') {
      return new Error(`${head} "accepted" to be (undefined | true | false), got ${accepted}`)
    }
    if (typeof get !== 'function') {
      return new Error(`${head} declaring "accepted" requires "get" to be (Function), got ${typeof get}`)
    }
  }

  return null
}
