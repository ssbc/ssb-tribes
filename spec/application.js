const { msgIdRegex } = require('ssb-ref')
const Overwrite = require('@tangle/overwrite')
const LinearAppend = require('@tangle/linear-append')
const { cloakedMessageId } = require('ssb-schema-definitions')()

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
    answers: Overwrite({
      valueSchema: {
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
    }),
    comment: Overwrite({ type: 'string' }),
    descision: Overwrite({
      type: 'object',
      required: ['approved'],
      properties: {
        approved: { type: 'boolean' },
        addMember: { type: 'string', pattern: msgIdRegex }
      },
      additionalProperties: false
    }),

    thread: LinearAppend()
    // we will mutate the saved transformations into this field with getTransform

    // tombstone
  },

  isValidNextStep (context, msg) {
    if (isRoot(msg)) {
      if (msg.value.content.descision) return false
    } else {
      if (msg.value.content.descision) {
        const applicant = context.graph.rootNodes[0].value.author
        if (applicant === msg.value.author) return false
      }
    }

    return true
  }
}

function isRoot (msg) {
  return msg.value.content.tangles.application.root === null
}
