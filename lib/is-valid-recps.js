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

const schema = {
  type: 'array',
  minItems: 1,
  maxItems: 16,
  items: [
    {
      oneOf: [GROUP, FEED]
    }
  ],
  additionalItems: FEED
}

module.exports = isMyJsonValid(schema, { verbose: true })
