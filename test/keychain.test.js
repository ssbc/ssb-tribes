const test = require('tape')
const Keychain = require('../keychain')

test('keychain', t => {
  const tests = [
    () => {
      const DESCRIPTION = 'group.add + group.list'

      const keychain = Keychain(`/tmp/keychain-${Date.now()}`)

      keychain.group.add('groupId_A', 'groupKey_A', (err, data) =>{
        keychain.group.list((err, data) => {
          t.deepEqual(data, { groupId_A: 'groupKey_A' }, DESCRIPTION)

          keychain.close()
        })
      })
    },

    () => {
      const DESCRIPTION = 'group.addAuthor + author.groups'

      const keychain = Keychain(`/tmp/keychain-${Date.now()}`)

      keychain.group.add('groupId_A', 'groupKey_A', (_, __) =>{
        keychain.group.add('groupId_B', 'groupKey_B', (_, __) =>{
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

      const keychain = Keychain(`/tmp/keychain-${Date.now()}`)

      keychain.group.add('groupId_A', 'groupKey_A', (_, __) =>{
        keychain.group.add('groupId_B', 'groupKey_B', (_, __) =>{
          keychain.group.addAuthor('groupId_A', '@mix', (_, __) => {
            keychain.group.addAuthor('groupId_B', '@mix', (_, __) => {
              keychain.author.keys('@mix', (err, keys) => {
                t.deepEqual(keys, ['groupKey_A', 'groupKey_B'], DESCRIPTION)

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
