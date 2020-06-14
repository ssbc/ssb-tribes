const Validator = require('is-my-ssb-valid')
const { feedId, cloakedMessageId } = require('ssb-schema-definitions')()

var schema = JSON.parse(require('./group-add-member.schema.js'))
delete schema.required
// var schema = {
//   $schema: 'http://json-schema.org/schema#',
//   type: 'object',
//   required: ['recps'],
//   properties: {
//     recps: {
//       type: 'array',
//       items: [
//         { $ref: '#/definitions/cloakedMessageId' }
//       ],
//       additionalItems: { $ref: '#/definitions/feedId' },
//       minItems: 2,
//       maxItems: 16
//     }
//   },
//   definitions: {
//     feedId,
//     cloakedMessageId
//   }
// }
schema = JSON.stringify(schema, null, 2)
// console.log(schema)
const isValid = Validator(schema)

var recps = [
  '%t1ekGZkPFfBkgqxofrZUIByzIi3kz7AYPgZ70GzNFmM=.cloaked',
  '@swxZBs+3Hbc7Ty9Sb/ZvaJVfeoU7hssaWx+sOMxr0LM=.ed25519',
  '@zZgwozS/AH9n5n6OB0P3DtS0nnO/nJ7GREvCiMx8jQM=.ed25519',
  '@kmLY0T9I3zIXxwYlDpZZ1T3yYHwzoiZaBf7ulShC6Ak=.ed25519',
  '@hBpp/T+3KCPTiG19XQTHNyh+gb0Yz6K1dSXIQTuZiUM=.ed25519',
  '@7Cv/xVUW89789e91JRSYSRAcdIYeSJzBQIbR8F9OhME=.ed25519',
  '@qcQiHEfolxxGcDXCRR0PnHnHN3Nvc+Qtv3ZShd0e3B4=.ed25519',
  '@faIznKXKuUG/oVJSFdHP5KUwwL6I0BW3PDuWEKPCak0=.ed25519',
  '@IbJJs44dmk/A5W6bg/oZAxDrHp0p6TdFoY/FFSj3Uow=.ed25519',
  '@iZCPxyJzr+lUg5GrdCLH1JZvAK+EKZGoaQz7Y++6yJo=.ed25519',
  '@oTu+QuHAEop34C8c+/gTtB+A1uuxcZJhto7P55/I4FE=.ed25519',
  '@eVZ4r/kLI9JXoV4m5nQDwl4EJ4fKOsAB/vrIAQpR2xw=.ed25519',
  '@vJpYPZ0T7VFd8Dd3tjCPUChcgDmN2PNdofmtwoWTcRk=.ed25519',
  '@S/KJ/cajcdQF2ZyMF4/enykblWsOYwbD6o9+bPMCKBk=.ed25519',
  '@H8GVtzZQVLPOndRTj8L5sq/Kk0/JgmHaaOMU9RSC6Yo=.ed25519',
  '@qNdMPwVxeDsonWWpgNvOXY/IJTkekN3jOt9N4phVXns=.ed25519'
]

function test (obj, expected = true) {
  if (isValid(obj) === expected) console.log(':)')
  else {
    console.log(`should ${expected ? '' : 'not '}be valid`, obj)
    if (expected === true) {
      console.log(isValid.errorsString)
    }
  }
}

const t = {
  true: (obj) => test(obj, true),
  false: (obj) => test(obj, false)
}

console.log('')
t.true({ recps })
t.false({ recps: ['%t1ekGZkPFfBkgqxofrZUIByzIi3kz7AYPgZ70GzNFmM=.cloaked'] })
t.false({ recps: ['%t1ekGZkPFfBkgqxofrZUIByzIi3kz7AYPgZ70GzNFmM=.cloaked', 'cat'] })
console.log(isValid({ recps: ['%t1ekGZkPFfBkgqxofrZUIByzIi3kz7AYPgZ70GzNFmM=.cloaked', 'cat'] }))

t.false({ recps: ['@swxZBs+3Hbc7Ty9Sb/ZvaJVfeoU7hssaWx+sOMxr0LM=.ed25519'] })

t.false({ recps: [
  '%t1ekGZkPFfBkgqxofrZUIByzIi3kz7AYPgZ70GzNFmM=.cloaked',
  '@swxZBs+3Hbc7Ty9Sb/ZvaJVfeoU7hssaWx+sOMxr0LM=.ed25519',
  '%t1ekGZkPFfBkgqxofrZUIByzIi3kz7AYPgZ70GzNFmM=.cloaked'
] })
