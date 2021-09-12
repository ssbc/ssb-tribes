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
    this.isRebuildRequested = false
    this.isRebuilding = false
    this.queue = Obz()

    ssb.rebuild.hook((rebuild, [cb]) => {
      this.isRebuilding = true

      rebuild.call(ssb, err => {
        this.isRebuilding = false
        this.queue.set(err)
        this.queue = Obz()

        if (typeof cb === 'function') cb(err)
        else err && console.error(err)
      })
    })
  }

  rebuild (cb) {
    if (this.isRebuilding) {
      const name = this.ssb.name ? this.ssb.name(this.ssb.id) : ''
      console.warn('rebuildManager.rebuild() called while database was rebuilding...', name)
    }

    if (!this.isRebuildRequested) {
      this.isRebuildRequested = true

      const interval = setInterval(
        () => {
          if (this.isIndexComplete) {
            const name = this.ssb.name ? ` (${this.ssb.name(this.ssb.id)})` : ''
            console.log('rebuild!!!   (ﾉ´ヮ´)ﾉ*:･ﾟ✧', name)
            this.ssb.rebuild(() => console.log('rebuild finished', name))

            this.isRebuildRequested = false
            clearInterval(interval)
          }
        },
        100
      )
    }

    // queue up cb for when rebuild is done
    if (typeof cb === 'function') this.queue.once(cb)
  }

  get isIndexComplete () {
    return this.ssb.status().sync.sync
  }
}
