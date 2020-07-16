const { isValid } = require('../../spec/application/application')

module.exports = function ApplicationGet (ssb, keystore, state) {
  return function applicationGet (applicationId, applicantId, opts = {}, cb) {
    const { key, root } = keystore.application.get(applicationId)

    const content = {
      type: 'group/application',
      version: 'v1',
      groupKey: key.toString('base64'),
      root,
      tangles: {
        application: { root, previous: [root] }
        // this is a dummy entry which is over-written in publish hook
        // it's needed to pass isValid
      },
      recps: [applicantId, ...groupAdmins]
    }

    if (opts.text) content.text = opts.text

    if (!isValid(content)) return cb(new Error(isValid.errorsString))

    ssb.publish(content, cb)
  }
}
