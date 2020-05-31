const test = require('tape')
const SCHEMES = require('private-group-spec/key-schemes.json').scheme
const keys = require('ssb-keys')

const KeyStore = require('../key-store')
const { GroupKey } = require('./helpers')
const directMessageKey = require('../lib/direct-message-key')
const FeedKeys = require('../lib/feed-keys')

var i = 0
function TmpPath () {
  return `/tmp/key-store-${Date.now()}-${i++}`
}

test('key-store', t => {
  const myKeys = buildKeys()

  const tests = [
    () => {
      const DESCRIPTION = 'group.add (error if bad key)'

      const keyStore = KeyStore(TmpPath(), myKeys)
      const junkKey = 'junk'

      keyStore.group.add('groupId_A', { key: junkKey }, (err) => {
        t.true(err, DESCRIPTION)
        keyStore.close()
      })
    },

    () => {
      const DESCRIPTION = 'group.add (error if try to double-add)'

      const keyStore = KeyStore(TmpPath(), myKeys, null, { loadState: false })
      const keyA = GroupKey()

      keyStore.group.add('groupId_A', { key: keyA }, (_, data) => {
        keyStore.group.add('groupId_A', { key: keyA }, (err) => {
          t.true(err, DESCRIPTION)
          keyStore.close()
        })
      })
    },

    () => {
      const DESCRIPTION = 'group.add + group.get'

      const keyStore = KeyStore(TmpPath(), myKeys, null, { loadState: false })
      const keyA = GroupKey()

      keyStore.group.add('groupId_A', { key: keyA }, (_, data) => {
        const info = keyStore.group.get('groupId_A')
        t.deepEqual(info, { key: keyA, scheme: SCHEMES.private_group }, DESCRIPTION)

        keyStore.close()
      })
    },

    () => {
      const DESCRIPTION = 'group.add + group.list'

      const keyStore = KeyStore(TmpPath(), myKeys)
      const keyA = GroupKey()

      keyStore.group.add('groupId_A', { key: keyA }, (_, data) => {
        keyStore.group.list((_, data) => {
          t.deepEqual(
            data,
            { groupId_A: { key: keyA, scheme: SCHEMES.private_group } },
            DESCRIPTION
          )

          keyStore.close()
        })
      })
    },

    () => {
      const DESCRIPTION = 'group.addAuthor (not a feedId errors)'

      const keyStore = KeyStore(TmpPath(), myKeys)
      const keyA = GroupKey()
      const keyB = GroupKey()

      keyStore.group.add('groupId_A', { key: keyA }, (_, __) => {
        keyStore.group.add('groupId_B', { key: keyB }, (_, __) => {
          keyStore.group.addAuthor('groupId_A', '@mix', (err) => {
            // console.log('ERRROR', err)
            t.true(err, DESCRIPTION)
            keyStore.close()
          })
        })
      })
    },

    () => {
      const DESCRIPTION = 'group.addAuthor + author.groups'

      const keyStore = KeyStore(TmpPath(), myKeys)
      const keyA = GroupKey()
      const keyB = GroupKey()

      const authorId = keys.generate().id

      keyStore.group.add('groupId_A', { key: keyA }, (_, __) => {
        keyStore.group.add('groupId_B', { key: keyB }, (_, __) => {
          keyStore.group.addAuthor('groupId_A', authorId, (_, __) => {
            keyStore.group.addAuthor('groupId_B', authorId, (_, __) => {
              const groups = keyStore.author.groups(authorId)
              t.deepEqual(groups, ['groupId_A', 'groupId_B'], DESCRIPTION)

              keyStore.close()
            })
          })
        })
      })
    },

    () => {
      const DESCRIPTION = 'group.addAuthor + author.keys'

      const keyStore = KeyStore(TmpPath(), myKeys, null, { loadState: false })
      const keyA = GroupKey()
      const keyB = GroupKey()

      const authorId = keys.generate().id

      keyStore.group.add('groupId_A', { key: keyA }, (_, __) => {
        keyStore.group.add('groupId_B', { key: keyB }, (_, __) => {
          keyStore.group.addAuthor('groupId_A', authorId, (_, __) => {
            keyStore.group.addAuthor('groupId_B', authorId, (_, __) => {
              const keys = keyStore.author.keys(authorId)
              const expected = [
                { key: keyA, scheme: SCHEMES.private_group },
                { key: keyB, scheme: SCHEMES.private_group },
                keyStore.author.sharedDMKey(authorId)
              ]
              t.deepEqual(keys, expected, DESCRIPTION)

              keyStore.close()
            })
          })
        })
      })
    },

    () => {
      const DESCRIPTION = 'author.keys (no groups)'

      const keyStore = KeyStore(TmpPath(), myKeys, null, { loadState: false })
      const keyA = GroupKey()
      const keyB = GroupKey()

      const authorId = keys.generate().id
      const otherAuthorId = keys.generate().id

      keyStore.group.add('groupId_A', { key: keyA }, (_, __) => {
        keyStore.group.add('groupId_B', { key: keyB }, (_, __) => {
          keyStore.group.addAuthor('groupId_A', authorId, (_, __) => {
            keyStore.group.addAuthor('groupId_B', authorId, (_, __) => {
              const keys = keyStore.author.keys(otherAuthorId)
              const expected = [
                keyStore.author.sharedDMKey(otherAuthorId)
              ]
              t.deepEqual(keys, expected, DESCRIPTION)

              keyStore.close()
            })
          })
        })
      })
    },

    () => {
      const DESCRIPTION = 'author.keys works after persistence (and ready())'

      const storePath = TmpPath()
      const keyStore = KeyStore(storePath, myKeys, null, { loadState: false })
      const keyA = GroupKey()
      const keyB = GroupKey()

      const authorId = keys.generate().id

      keyStore.group.add('groupId_A', { key: keyA }, (_, __) => {
        keyStore.group.add('groupId_B', { key: keyB }, (_, __) => {
          keyStore.group.addAuthor('groupId_A', authorId, (_, __) => {
            keyStore.group.addAuthor('groupId_B', authorId, (_, __) => {
              keyStore.close(() => {
                const newKeyStore = KeyStore(storePath, myKeys, () => {
                  const keys = newKeyStore.author.keys(authorId)
                  const expected = [
                    { key: keyA, scheme: SCHEMES.private_group },
                    { key: keyB, scheme: SCHEMES.private_group },
                    keyStore.author.sharedDMKey(authorId)
                  ]
                  t.deepEqual(keys, expected, DESCRIPTION)

                  keyStore.close()
                })
              })
            })
          })
        })
      })
    },

    () => {
      const DESCRIPTION = 'author.sharedDMKey'
      // this is also tested by the "no groups" case above

      const storePath = TmpPath()
      const keyStore = KeyStore(storePath, myKeys, null, { loadState: false })

      const otherKeys = buildKeys() // some other feed
      const sk = myKeys.buffers.secret
      const pk = otherKeys.buffers.public

      const expectedDMKey = directMessageKey(sk)(pk)

      t.deepEqual(
        keyStore.author.sharedDMKey(otherKeys.id),
        {
          key: expectedDMKey,
          scheme: SCHEMES.feed_id_dm
        },
        DESCRIPTION
      )
    }
  ]

  t.plan(tests.length)
  tests.forEach(i => i())
})

function buildKeys () {
  const ssbKeys = keys.generate()

  return {
    public: ssbKeys.public,
    private: ssbKeys.private,
    // secret: null, // << this is a better name!
    id: ssbKeys.id,

    buffers: new FeedKeys(ssbKeys).toBuffer()
  }
}
