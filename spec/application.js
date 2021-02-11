const { msgIdRegex } = require('ssb-ref')
const Overwrite = require('@tangle/overwrite')
const LinearAppend = require('@tangle/linear-append')
const { feedId, cloakedMessageId } = require('ssb-schema-definitions')()

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
const commentSchema = { type: 'string' }
const decisionSchema = {
  type: 'object',
  required: ['approved'],
  properties: {
    approved: { type: 'boolean' },
    addMember: { type: 'string', pattern: msgIdRegex }
  },
  additionalProperties: false
}
const uniqueKeyPattern = [
  '^\\d+', // timestamp
  '@[a-zA-Z0-9/+]{43}=\\.ed25519', // feedId
  '\\d+$' // count (nth historyItem from within particular message)
].join('-')

module.exports = {
  type: 'group/application',
  tangle: 'application',

  staticProps: {
    groupId: {
      type: 'string',
      pattern: cloakedMessageId.pattern,
      required: true
    },
    version: {
      type: 'string',
      pattern: '^v2$',
      required: true
    }
  },

  props: {
    answers: Overwrite({ valueSchema: answersSchema }),
    comment: Overwrite({ valueSchema: commentSchema }),
    decision: Overwrite({ valueSchema: decisionSchema }),

    history: LinearAppend({
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
    // we will mutate the saved transformations into this field with getTransform

    // tombstone
  },

  getTransformation (m) {
    const T = m.value.content
    T.history = {}
    // const T = { ...m.value.content } // could clone to avoid mutating the content

    let count = 0
    if (T.answers) {
      T.history[uniqueKey(m, count)] = historyItem(m, 'answers')
      count++
    }

    if (T.comment) {
      T.history[uniqueKey(m, count)] = historyItem(m, 'comment')
      count++
    }

    if (T.decision) {
      T.history[uniqueKey(m, count)] = historyItem(m, 'decision')
      count++
    }

    if (Object.keys(T.history).length === 0) delete T.history

    return T
  },

  isValidNextStep (context, msg) {
    if (isRoot(msg)) {
      if (msg.value.content.decision) return false
    } else {
      if (msg.value.content.decision) {
        const applicant = context.graph.rootNodes[0].value.author
        if (applicant === msg.value.author) return false
      }
    }

    return true
  }
}

function uniqueKey (m, count) {
  return [m.value.timestamp, m.value.author, count].join('-')
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

function isRoot (msg) {
  return msg.value.content.tangles.application.root === null
}
