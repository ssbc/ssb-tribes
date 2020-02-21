const isCanonicalBase64 = require('is-canonical-base64')

const cloakedMsgIdRegex = isCanonicalBase64('%', '\\.cloaked', 32)

module.exports = function isCloakedMsgId (str) {
  return (
    typeof str === 'string' &&
    cloakedMsgIdRegex.test(str)
  )
}

// TODO - extract this to ssb-ref
