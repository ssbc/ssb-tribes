const test = require('tape')
const na = require('sodium-native')
const Keychain = require('../keychain')

function Key () {
  var key = Buffer.alloc(32)
  na.randombytes_buf(key)

  return key
}

function TmpPath () {
  return `/tmp/keychain-${Date.now()}-${Math.floor(Math.random()*100)}`
}

test('keychain', t => {
  const tests = [
    () => {
      const DESCRIPTION = 'group.add (error if invalid)'

      const keychain = Keychain(TmpPath())
      const keyA = 'junk'

      keychain.group.add('groupId_A', keyA, (err, data) =>{
        t.true(err, DESCRIPTION)
        keychain.close()
      })
    },

    () => {
      const DESCRIPTION = 'group.add + group.list'

      const keychain = Keychain(TmpPath())
      const keyA = Key()

      keychain.group.add('groupId_A', keyA, (err, data) =>{
        keychain.group.list((err, data) => {
          t.deepEqual(data, { groupId_A: keyA }, DESCRIPTION)

          keychain.close()
        })
      })
    },

    () => {
      const DESCRIPTION = 'group.addAuthor + author.groups'

      const keychain = Keychain(TmpPath())
      const keyA = Key()
      const keyB = Key()

      keychain.group.add('groupId_A', keyA, (_, __) =>{
        keychain.group.add('groupId_B', keyB, (_, __) =>{
          keychain.group.addAuthor('groupId_A', '@mix', (_, __) => {
            keychain.group.addAuthor('groupId_B', '@mix', (_, __) => {
              keychain.author.groups('@mix', (err, keys) => {
                t.deepEqual(keys, ['groupId_A', 'groupId_B'], DESCRIPTION)

                keychain.close()
              })
            })
          })
        })
      })
    },

    () => {
      const DESCRIPTION = 'group.addAuthor + author.keys'

      const keychain = Keychain(TmpPath())
      const keyA = Key()
      const keyB = Key()

      keychain.group.add('groupId_A', keyA, (_, __) =>{
        keychain.group.add('groupId_B', keyB, (_, __) =>{
          keychain.group.addAuthor('groupId_A', '@mix', (_, __) => {
            keychain.group.addAuthor('groupId_B', '@mix', (_, __) => {
              keychain.author.keys('@mix', (err, keys) => {
                t.deepEqual(keys, [ keyA, keyB ], DESCRIPTION)

                keychain.close()
              })
            })
          })
        })
      })
    },

    () => {
      const DESCRIPTION = 'group.addAuthor + author.keys'

      const keychain = Keychain(TmpPath())
      const keyA = Key()
      const keyB = Key()

      keychain.group.add('groupId_A', keyA, (_, __) =>{
        keychain.group.add('groupId_B', keyB, (_, __) =>{
          keychain.group.addAuthor('groupId_A', '@mix', (_, __) => {
            keychain.group.addAuthor('groupId_B', '@mix', (_, __) => {
              keychain.author.keys('@mix', (err, keys) => {
                t.deepEqual(keys, [ keyA, keyB ], DESCRIPTION)

                keychain.close()
              })
            })
          })
        })
      })
    }
  ]

  t.plan(tests.length)
  tests.forEach(i => i())
})
