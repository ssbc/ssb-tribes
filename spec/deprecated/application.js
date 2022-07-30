const { msgIdRegex } = require('ssb-ref')
const Overwrite = require('@tangle/overwrite')
const LinearAppend = require('@tangle/linear-append')
const { feedId, cloakedMessageId, messageId } = require('ssb-schema-definitions')()

const answersSchema = {
  type: 'array',
  items: {
    type: 'object',
    required: ['q', 'a'],
    properties: {
      q: { type: 'string' },
      a: { type: 'string' }
    },
    additionalProperties: false
  }
}
const decisionSchema = {
  type: 'object',
  required: ['accepted'],
  properties: {
    accepted: { type: 'boolean' },
    addMember: { type: 'string', pattern: msgIdRegex }
  },
  additionalProperties: false
}

module.exports = {
  type: 'group/application',
  tangle: 'application',

  staticProps: {
    groupId: {
      type: 'string',
      pattern: cloakedMessageId.pattern,
      required: true
    },
    profileId: {
      type: ['string', 'null'],
      pattern: messageId.pattern
    },
    version: {
      type: 'string',
      pattern: '^v(2|2\\.1)$',
      required: true
    }
  },

  props: {
    answers: Overwrite({ valueSchema: answersSchema }),
    comment: Overwrite({ valueSchema: { type: 'string' } }),
    decision: Overwrite({ valueSchema: decisionSchema }),

    history: History()

    // tombstone
  },

  getTransformation (m, distance = 0) {
    const T = m.value.content

    return decorateHistory({ ...T }, m, distance)
    // history is not a field that people will mutate generally
    // instead, it's a field we push values into from other fields into (with additional data)
    // so that we can have a nice linear and easy to render record

    // challenge is that answers/ comment/ decision fields must pass their own validations
    // AND the history validation (when they are mapped in decorated form into history mutations)
  },

  isValidNextStep (context, node) {
    if (node.previos === null) {
      if (node.data.decision) return false
    } else {
      if (node.data.decision) {
        const applicant = context.graph.rootNodes[0].author
        if (applicant === node.author) return false
      }
    }

    return true
  }
}

function History () {
  const uniqueKeyPattern = [
    '^\\d{4}', // tangle-distance
    '[\\d\\.]{13,}', // timestamp
    '@[a-zA-Z0-9/+]{43}=\\.ed25519', // feedId
    '\\d+$' // count (nth historyItem from within particular message)
  ].join('-')

  return LinearAppend({
    keyPattern: uniqueKeyPattern,
    valueSchema: {
      type: 'object',
      properties: {
        oneOf: [
          {
            type: { type: 'string', pattern: '^answers$' },
            author: feedId,
            timestamp: { type: 'number' },
            body: answersSchema
          },
          {
            type: { type: 'string', pattern: '^comment$' },
            author: feedId,
            timestamp: { type: 'number' },
            body: { type: 'string' }
          },
          {
            type: { type: 'string', pattern: '^decision$' },
            author: feedId,
            timestamp: { type: 'number' },
            body: decisionSchema
          }
        ]
      },
      required: ['type', 'author', 'timestamp', 'body']
      // additionalProperties: false // ? not sure why this doesn't work
    }
  })
}
function decorateHistory (T, m, distance) {
  T.history = {}
  // const T = { ...m.value.content } // could clone to avoid mutating the content

  let count = 0
  if (T.answers) {
    T.history[uniqueKey(distance, m, count)] = historyItem(m, 'answers')
    count++
  }

  if (T.comment) {
    T.history[uniqueKey(distance, m, count)] = historyItem(m, 'comment')
    count++
  }

  if (T.decision) {
    T.history[uniqueKey(distance, m, count)] = historyItem(m, 'decision')
    count++
  }

  if (Object.keys(T.history).length === 0) delete T.history

  return T
}

function uniqueKey (distance, m, count) {
  let d = distance.toString()
  while (d.length < 4) d = '0' + d
  return [d, m.value.timestamp, m.value.author, count].join('-')
}
function historyItem (m, field) {
  return {
    type: field,
    author: m.value.author,
    timestamp: m.value.timestamp,
    body: m.value.content[field].set
    // NOTE plucking body like this only works while all the fields are of type Overwrite
  }
}
