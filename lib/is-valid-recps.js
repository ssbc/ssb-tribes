const isMyJsonValid = require('is-my-json-valid')
const { feedIdRegex, cloakedMsgIdRegex } = require('ssb-ref')

const toPattern = regex => regex.toString().slice(1, -1)
const FEED = {
  type: 'string',
  pattern: toPattern(feedIdRegex)
}
const GROUP = {
  type: 'string',
  pattern: toPattern(cloakedMsgIdRegex)
}
const POBOX = {
  type: 'string',
  pattern: '^ssb:identity/po-box/[a-zA-Z0-9-_]{43,}=?$'
}

const schema = {
  type: 'array',
  minItems: 1,
  maxItems: 16,
  items: [
    {
      oneOf: [GROUP, FEED, POBOX]
    }
  ],
  additionalItems: {
    anyOf: [FEED, POBOX]
  }
}

module.exports = isMyJsonValid(schema, { verbose: true })
