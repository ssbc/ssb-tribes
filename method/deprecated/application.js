const Crut = require('ssb-crut')
const pull = require('pull-stream')
const paraMap = require('pull-paramap')
const { isCloakedMsg: isGroup } = require('ssb-ref')

const spec = require('../../spec/deprecated/application.js')

let isWarned = false

// WARNING 2023-09-04 (mix)
// the test for this were causing problems so were deleted
// this means changing this function is no longer safe

module.exports = function Application (ssb) {
  const crut = new Crut(ssb, spec)

  function pruneInput (input) {
    delete input.groupId
    delete input.version
    delete input.history

    return input
  }

  const groupApplicationList = GroupApplicationList(ssb, crut)

  return {
    create (groupId, adminIds, input = {}, cb) {
      if (typeof input === 'function') {
        cb = input
        input = {}
      }

      if (!isWarned) {
        isWarned = true
        console.log('ssb-tribes applications have been deprecated, please use ssb-tribes-registratoin')
      }

      crut.create({
        groupId,
        version: 'v2.1',
        ...pruneInput(input),

        recps: [...adminIds, ssb.id]
      }, cb)
    },
    get (applicationId, cb) {
      crut.read(applicationId, (err, application) => {
        if (err) return cb(err)

        // find the latest accept/ reject decisions
        const decisions = application.states[0].history.reduce((acc, h) => {
          if (h.type !== 'decision') return acc

          if (h.body.accepted) acc.accept = h.body
          else acc.reject = h.body

          return acc
        }, { accept: null, reject: null })

        cb(null, {
          id: applicationId,
          groupId: application.groupId,
          profileId: application.profileId || null,
          applicantId: application.originalAuthor,
          groupAdmins: application.recps.filter(a => a !== application.originalAuthor),

          answers: application.states[0].answers,
          decision: decisions.accept || decisions.reject || null, // accept > reject > nothng
          history: application.states[0].history,
          tombstone: application.states[0].tombstone
        })
      })
    },

    /* update */
    update (applicationId, input, cb) {
      crut.update(applicationId, pruneInput(input), cb)
    },
    tombstone (applicationId, input, cb) {
      crut.tombstone(applicationId, input, cb)
    },
    comment (applicationId, comment, cb) {
      crut.update(applicationId, { comment }, cb)
    },
    accept (applicationId, opts = {}, cb) {
      const {
        applicationComment,
        groupIntro = ''
      } = opts

      ssb.tribes.application.get(applicationId, (err, application) => {
        if (err) return cb(err)

        const { groupId, applicantId } = application

        ssb.tribes.invite(groupId, [applicantId], { text: groupIntro }, (err, invite) => {
          if (err) return cb(err)

          const input = {
            decision: {
              accepted: true,
              addMember: invite.key
            }
          }
          if (applicationComment) input.comment = applicationComment

          crut.update(applicationId, input, cb)
        })
      })
    },
    reject (applicationId, opts = {}, cb) {
      const input = {
        decision: { accepted: false }
      }
      if (opts.reason && opts.reason.length) input.comment = opts.reason
      crut.update(applicationId, input, cb)
    },

    list (opts, cb) {
      if (typeof opts === 'function') return groupApplicationList({}, opts)

      groupApplicationList(opts, cb)
    }
  }
}

function GroupApplicationList (server, crut) {
  return function groupApplicationList (opts, cb) {
    if (opts.get === true) opts.get = server.tribes.application.get
    if (opts.accepted !== undefined && !opts.get) opts.get = server.tribes.application.get

    const optsError = findOptsError(opts)
    if (optsError) return cb(optsError)

    const { groupId, get, accepted } = opts
    const query = [
      {
        $filter: {
          value: {
            content: {
              type: 'group/application',
              // version: 'v2.1',
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

    pull(
      server.query.read({ query }),
      pull.filter(crut.isRoot),
      (groupId)
        ? pull.filter(m => m.value.content.groupId === groupId)
        : null,

      pull.map(m => m.key),

      // (optionally) convert applicationIds into application records
      (get !== undefined)
        ? pull(
          paraMap(
            (id, cb) => get(id, (err, application) => {
              if (err) return cb(null, null) // don't choke of failed gets
              return cb(null, application)
            })
            , 4
          ), // 4 = width of parallel querying
          pull.filter(Boolean) // filter out failed gets
        )
        : null,

      // (optionally) filter applications by whether accepted
      (accepted !== undefined)
        ? pull.filter(a => {
          if (accepted === null) return a.decision === null // no response
          return a.decision && a.decision.accepted === accepted // boolean
        })
        : null,

      // filter out tombstoned applications if possible
      pull.filter(a => {
        if (typeof a === 'string') return true
        if ('tombstone' in a) return a.tombstone === null
        return true
      }),

      pull.collect((err, data) => {
        cb(err, data)
      })
    )
  }
}

const VALID_ACCEPTED = [undefined, null, true, false]
function findOptsError ({ groupId, get, accepted }) {
  const head = 'tribes.application.list expected '
  if (groupId && !isGroup(groupId)) {
    return new Error(`${head} "groupId" to be (undefined | GroupId}, got ${groupId}`)
  }
  if (get && typeof get !== 'function') {
    return new Error(`${head} "get" to be (Function), got ${typeof get}`)
  }
  if (accepted !== undefined) {
    if (!VALID_ACCEPTED.includes(accepted)) {
      return new Error(`${head} "accepted" to be (undefined | null | true | false), got ${accepted}`)
    }
    if (typeof get !== 'function') {
      return new Error(`${head} declaring "accepted" requires "get" to be (Function), got ${typeof get}`)
    }
  }

  return null
}
