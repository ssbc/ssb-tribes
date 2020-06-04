const isCanonicalBase64 = require('is-canonical-base64')

const cloakedMsgIdRegex = isCanonicalBase64('%', '\\.cloaked', 32)
// TODO - extract this to ssb-ref

function isCloakedMsgId (str) {
  return (
    typeof str === 'string' &&
    cloakedMsgIdRegex.test(str)
  )
}
isCloakedMsgId.regex = cloakedMsgIdRegex

module.exports = isCloakedMsgId
