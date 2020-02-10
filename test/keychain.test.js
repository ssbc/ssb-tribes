const test = require('tape')
const Keychain = require('../keychain')

test('keychain', t => {
  const tests = [
    () => {
      const path = `/tmp/keychain-${Date.now()}`
      const keychain = Keychain(path)

      keychain.group.add('groupId_A', 'groupKey_A', (err, data) =>{
        keychain.group.list((err, data) => {
          t.deepEqual(data, { groupId_A: 'groupKey_A' }, 'group.add')

          keychain.close()
        })
      })
    },

    () => {
      const path = `/tmp/keychain-${Date.now()}`
      const keychain = Keychain(path)

      keychain.group.add('groupId_A', 'groupKey_A', (_, __) =>{
        keychain.group.add('groupId_B', 'groupKey_B', (_, __) =>{
          keychain.group.addAuthor('groupId_A', '@mix', (_, __) => {
            keychain.group.addAuthor('groupId_B', '@mix', (_, __) => {
              keychain.author.keys('@mix', (err, keys) => {
                t.deepEqual(keys, ['groupKey_A', 'groupKey_B'], 'member.keys')

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
