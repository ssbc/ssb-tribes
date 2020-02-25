const test = require('tape')
const KeyStore = require('../key-store')
const { GroupKey } = require('./helpers')

function TmpPath () {
  return `/tmp/key-store-${Date.now()}-${Math.floor(Math.random()*100)}`
}

test('key-store', t => {
  const tests = [
    () => {
      const DESCRIPTION = 'group.add (error if invalid)'

      const keyStore = KeyStore(TmpPath())
      const keyA = 'junk'

      keyStore.group.add('groupId_A', { key: keyA }, (err, data) => {
        t.true(err, DESCRIPTION)
        keyStore.close()
      })
    },

    () => {
      const DESCRIPTION = 'group.add + group.get'

      const keyStore = KeyStore(TmpPath(), null, { init: false })
      const keyA = GroupKey()

      keyStore.group.add('groupId_A', { key: keyA }, (_, data) => {
        const info = keyStore.group.get('groupId_A')
        t.deepEqual(info, { key: keyA }, DESCRIPTION)

        keyStore.close()
      })
    },

    () => {
      const DESCRIPTION = 'group.add + group.list'

      const keyStore = KeyStore(TmpPath())
      const keyA = GroupKey()

      keyStore.group.add('groupId_A', { key: keyA }, (_, data) => {
        keyStore.group.list((_, data) => {
          t.deepEqual(data, { groupId_A: { key: keyA } }, DESCRIPTION)

          keyStore.close()
        })
      })
    },

    () => {
      const DESCRIPTION = 'group.addAuthor + author.groups'

      const keyStore = KeyStore(TmpPath())
      const keyA = GroupKey()
      const keyB = GroupKey()

      keyStore.group.add('groupId_A', { key: keyA }, (_, __) => {
        keyStore.group.add('groupId_B', { key: keyB }, (_, __) => {
          keyStore.group.addAuthor('groupId_A', '@mix', (_, __) => {
            keyStore.group.addAuthor('groupId_B', '@mix', (_, __) => {
              const groups = keyStore.author.groups('@mix')
              t.deepEqual(groups, ['groupId_A', 'groupId_B'], DESCRIPTION)

              keyStore.close()
            })
          })
        })
      })
    },

    () => {
      const DESCRIPTION = 'group.addAuthor + author.keys'

      const keyStore = KeyStore(TmpPath(), null, { init: false })
      const keyA = GroupKey()
      const keyB = GroupKey()

      keyStore.group.add('groupId_A', { key: keyA }, (_, __) => {
        keyStore.group.add('groupId_B', { key: keyB }, (_, __) => {
          keyStore.group.addAuthor('groupId_A', '@mix', (_, __) => {
            keyStore.group.addAuthor('groupId_B', '@mix', (_, __) => {
              const keys = keyStore.author.keys('@mix')
              t.deepEqual(keys, [keyA, keyB], DESCRIPTION)

              keyStore.close()
            })
          })
        })
      })
    },

    () => {
      const DESCRIPTION = 'author.keys (no groups)'

      const keyStore = KeyStore(TmpPath(), null, { init: false })
      const keyA = GroupKey()
      const keyB = GroupKey()

      keyStore.group.add('groupId_A', { key: keyA }, (_, __) => {
        keyStore.group.add('groupId_B', { key: keyB }, (_, __) => {
          keyStore.group.addAuthor('groupId_A', '@mix', (_, __) => {
            keyStore.group.addAuthor('groupId_B', '@mix', (_, __) => {
              const keys = keyStore.author.keys('@daisy')
              t.deepEqual(keys, [], DESCRIPTION)

              keyStore.close()
            })
          })
        })
      })
    },

    () => {
      const DESCRIPTION = 'author.keys works after persistence (and ready())'

      const storePath = TmpPath()
      const keyStore = KeyStore(storePath, null, { init: false })
      const keyA = GroupKey()
      const keyB = GroupKey()

      keyStore.group.add('groupId_A', { key: keyA }, (_, __) => {
        keyStore.group.add('groupId_B', { key: keyB }, (_, __) => {
          keyStore.group.addAuthor('groupId_A', '@mix', (_, __) => {
            keyStore.group.addAuthor('groupId_B', '@mix', (_, __) => {
              keyStore.close(() => {
                const newKeyStore = KeyStore(storePath, () => {
                  const keys = newKeyStore.author.keys('@mix')
                  t.deepEqual(keys, [keyA, keyB], DESCRIPTION)

                  keyStore.close()
                })
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
