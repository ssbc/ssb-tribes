const Crut = require('ssb-crut')
const spec = require('../spec/application.js')

module.exports = function Application (ssb) {
  const crut = new Crut(ssb, spec)

  return {
    create (groupId, adminIds, { answers, text } = {}, cb) {
      crut.create({
        groupId,
        version: 'v2',
        answers,

        recps: [...adminIds, ssb.id]
      }, cb)
    },
    read () {},

    /* update */
    update: crut.update.bind(crut),
    comment () {},
    accept () {},
    reject () {},

    list () {}
  }
}
