const test = require('tape')
const Crut = require('ssb-crut')
const crypto = require('crypto')

const poboxSpec = require('../../../../spec/group/add-pobox')
const { GroupId, Server } = require('../../../helpers')

const Mock = (keys) => {
  return {
    type: 'group/poBox',
    recps: [
      GroupId()
      // add 15 feedId
    ],
    keys: {
      set: keys
    },
    tangles: {
      group: {
        root: '%THxjTGPuXvvxnbnAV7xVuVXdhDcmoNtDDN0j3UTxcd8=.sha256',
        previous: [
          '%Sp294oBk7OJxizvPOlm6Sqk3fFJA2EQFiyJ1MS/BZ9E=.sha256'
        ]
      },
      poBox: {
        root: '%THxjTGPuXvvxnbnAV7xVuVXdhDcmoNtDDN0j3UTxcd8=.sha256',
        previous: [
          '%lm6Sqk3fFJA2EQFiyJ1MSASDASDASDASDASDAS/BZ9E=.sha256',
          '%Sp294oBk7OJxizvPOlm6Sqk3fFJA2EQFiyJ1MS/BZ9E=.sha256'
        ]
      }
    }
  }
}

test('is-group-add-pobox', t => {
  const server = Server()
  const { isUpdate: isValid } = new Crut(server, poboxSpec).spec
  const secretKey = crypto.randomBytes(8).toString('base64')

  const validKeys = [
    null,
    { publicKey: 'ssb://random_public_key', secretKey }
  ]

  validKeys.forEach(keys => {
    t.true(
      isValid(Mock(keys)),
      `accepts keys=${JSON.stringify(keys)}`
    )
  })

  const invalidKeys = [
    undefined,
    {},
    { publicKey: 'dog', secretKey },
    { publicKey: 'ssb://random_public_key', secretKey: 'dog' }
  ]

  invalidKeys.forEach((keys) => {
    t.false(
      isValid(Mock(keys)),
      `keys=${JSON.stringify(keys)} is invalid`
    )
  })

  // NOTE: ssb-crut errorsString not helpful for nested props

  server.close()
  t.end()
})
