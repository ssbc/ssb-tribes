const { print } = require('../helpers')

// {
//   type: 'group/init'
//   name: { set: 'pacific butts consortium' },  // optional
//   tangles: {
//     group: {
//       root: null,
//       previous: null
//     }
//   }
// }

const schema = {
  type: 'object',
  required: ['type', 'tangles'],
  properties: {
    type: {
      type: 'string',
      pattern: '^group/init$'
    },

    name: {
      type: 'object',
      required: ['set'],
      properties: {
        set: { type: 'string' }
      }
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
  }
}

print('schema/group-init.schema.json', schema)
