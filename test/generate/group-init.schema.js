const { print } = require('../helpers')

// {
//   type: 'group/init'
//   tangles: {
//     group: {
//       root: null,
//       previous: null
//     }
//   }
// }

const schema = {
  $schema: 'http://json-schema.org/schema#',
  type: 'object',
  required: ['type', 'tangles'],
  properties: {
    type: {
      type: 'string',
      pattern: '^group/init$'
    },

    tangles: {
      type: 'object',
      required: ['group'],
      properties: {
        group: {
          type: 'object',
          required: ['root', 'previous'],
          properties: {
            root: { type: 'null' },
            previous: { type: 'null' }
          }
        }
      }
    }
  },
  additionalProperties: false
}

print('schema/group-init.schema.json', schema)
