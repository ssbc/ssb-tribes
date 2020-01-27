const test = require('tape')
const { box } = require('private-box2')
const Server = require('./server')
const { Key, GroupId } = require('./crypto')

test('read', t => {
  const server = Server()

  const plainText = Buffer.from('a hope this karakia goes ok', 'utf8')
  const groupKey = Buffer.from(Key(), 'base64')

  const msgKey = Buffer.from(Key(), 'base64')
  const externalNonce = Buffer.from(Key(), 'base64')

  const ciphertext = box(plainText, externalNonce, msgKey, [groupKey])
  const string = ciphertext.toString('base64') + '.box2'

  console.log('ciphertext', string)
  console.log('')

  const feedKey = server.id
    .replace('@', '')
    .replace('.ed25519', '')

  const crypto = require('crypto')
  const hmac = crypto.createHmac('sha256', Buffer.from(feedKey, 'base64'))
  const previous = '%2NzFALXpzIE0baMn+hH5G1syDreI0XJ2lfkEAN3Lx4k=.sha256'
  // previous could be null
  hmac.update(previous)
  const external_nonce = hmac.digest('base64')
  console.log('external nonce', external_nonce)
  console.log(external_nonce.length)

  server.close()
  t.end()
})

// TODO
// - add unboxer which recognises .box2 strings
// - get this test about to pass
// - write spec + tests for external_nonce calcuation


// SSB-specs to write
//
// - how to calculate external_nonce
// - how to derive groupId
// - need a store which tracks:
//   - groupId > groupKey
//   - if a box2 message comes from feedId X, which keys should I try (find which groups a feedId has access to)
