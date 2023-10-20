// TODO: remove this file?

const Obz = require('obz')

/*
 * We want the RebuildManager to field requests for a db rebuild to be done.
 * It can receive many of these, but will only start the rebuild once indexing is complete
 * The reason for this is to minimise the number of times a rebuild is required - we don't want to
 * have to do one for each time we discover a new group member...
 *
 * After the rebuild is complete the RebuildManager ensures all callbacks passed to it are then run
 */

module.exports = class RebuildManager {
  constructor (ssb) {
    this.ssb = ssb
    //   isIndexing
    this.isInitializing = false
    this.isRebuilding = false

    this.requests = new Requests()
    this.nextRequests = new Requests()
  }

  rebuild (reason, cb) {
    this.ssb.db.reindexEncrypted((err) => {
      if (err) return cb(Error('reindexencrypted failed in rebuild-manager', { cause: err }))
      if (cb) return cb()
    })

    // if (this.isRebuilding) {
    //  // if the current rebuild was already kicked off by a reason we're not registering, it's safe to
    //  // add it to the current rebuild process (so long as the "reasons" was specific enough)
    //  if (this.requests.has(reason)) this.requests.add(reason, cb)
    //  // otherwise, queue it up for the next round of rebuilds - this is because we may have added new things to
    //  // the keyring which would justify re-trying decrypting all messages
    //  else this.nextRequests.add(reason, cb)

    //  return
    // }

    // this.requests.add(reason, cb)
    // this.initiateRebuild()
  }

  // initiateRebuild () {
  //  if (this.isInitializing) return

  //  this.isInitializing = true
  //  const interval = setInterval(
  //    () => {
  //      if (this.isIndexing) return

  //      this.ssb.rebuild()
  //      this.isInitializing = false

  //      clearInterval(interval)
  //    },
  //    100
  //  )
  // }

  get isIndexing () {
    return this.ssb.status().sync.sync !== true
  }
}

function Requests () {
  const reasons = new Set([])
  const callbacks = Obz()

  return {
    add (reason, cb) {
      if (!reason) throw new Error('rebuild requests request a reason')
      reasons.add(reason)

      if (cb === undefined) return

      if (typeof cb === 'function') callbacks.once(cb)
      else throw new Error(`expected cb to be function, got ${cb}`)
    },
    has (reason) {
      return reasons.has(reason)
    },
    hasRequests () {
      return reasons.size > 0
    },
    callback (err) {
      callbacks.set(err)
    },
    get reasons () {
      return Array.from(reasons)
    },
    get size () {
      return reasons.size
    }
  }
}
