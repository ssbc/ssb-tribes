const test = require('tape')
const SCHEMES = require('private-group-spec/key-schemes.json').scheme
const { generate } = require('ssb-keys')

const KeyStore = require('../key-store')
const { GroupKey, GroupId } = require('./helpers')
const directMessageKey = require('../lib/direct-message-key')
const { MsgId } = require('../lib/cipherlinks')

function MessageId () {
  return new MsgId().mock().toSSB()
}

var i = 0
function TmpPath () {
  return `/tmp/key-store-${Date.now()}-${i++}`
}

test('key-store', t => {
  const myKeys = generate() // some ssb-keys

  const tests = [
    () => {
      const DESCRIPTION = 'group.add (error if bad groupId)'

      const keyStore = KeyStore(TmpPath(), myKeys)

      keyStore.group.add('junk', { key: GroupKey(), initialMsg: MessageId() }, (err) => {
        t.match(err && err.message, /expected a groupId/, DESCRIPTION)
        keyStore.close()
      })
    },

    () => {
      const DESCRIPTION = 'group.add (error if bad key)'

      const keyStore = KeyStore(TmpPath(), myKeys)

      keyStore.group.add(GroupId(), { key: 'junk', initialMsg: MessageId() }, (err) => {
        t.match(err && err.message, /invalid groupKey/, DESCRIPTION)
        keyStore.close()
      })
    },

    () => {
      const DESCRIPTION = 'group.add (error if bad initialMsg)'

      const keyStore = KeyStore(TmpPath(), myKeys)

      keyStore.group.add(GroupId(), { key: GroupKey(), initialMsg: 'dog' }, (err) => {
        t.match(err && err.message, /expects initialMsg/, DESCRIPTION)
        keyStore.close()
      })
    },

    () => {
      const DESCRIPTION = 'group.add (error if try to double-add)'

      const keyStore = KeyStore(TmpPath(), myKeys, null, { loadState: false })
      const groupId = GroupId()
      const key = GroupKey()
      const initialMsg = MessageId()

      keyStore.group.add(groupId, { key, initialMsg }, (_, data) => {
        keyStore.group.add(groupId, { key, initialMsg }, (err) => {
          t.match(err && err.message, /key-store already contains group/, DESCRIPTION)
          keyStore.close()
        })
      })
    },

    () => {
      const DESCRIPTION = 'group.add + group.get'

      const keyStore = KeyStore(TmpPath(), myKeys, null, { loadState: false })
      const groupId = GroupId()
      const key = GroupKey()
      const initialMsg = MessageId()

      keyStore.group.add(groupId, { key, initialMsg }, (_, data) => {
        const info = keyStore.group.get(groupId)
        t.deepEqual(info, { key, initialMsg, scheme: SCHEMES.private_group }, DESCRIPTION)

        keyStore.close()
      })
    },

    () => {
      const DESCRIPTION = 'group.add + group.list'

      const keyStore = KeyStore(TmpPath(), myKeys, null, { loadState: false })
      const groupId = GroupId()
      const key = GroupKey()
      const initialMsg = MessageId()

      keyStore.group.add(groupId, { key, initialMsg }, (err, data) => {
        if (err) throw err

        keyStore.group.list((err, data) => {
          if (err) throw err
          t.deepEqual(
            data,
            { [groupId]: { key, initialMsg, scheme: SCHEMES.private_group } },
            DESCRIPTION
          )

          keyStore.close()
        })
      })
    },

    () => {
      const DESCRIPTION = 'group.addAuthor (not a feedId errors)'

      const keyStore = KeyStore(TmpPath(), myKeys)
      const groupId_A = GroupId()
      const groupId_B = GroupId()
      const keyA = GroupKey()
      const keyB = GroupKey()
      const initialMsg_A = MessageId()
      const initialMsg_B = MessageId()

      keyStore.group.add(groupId_A, { key: keyA, initialMsg: initialMsg_A }, (_, __) => {
        keyStore.group.add(groupId_B, { key: keyB, initialMsg: initialMsg_B }, (_, __) => {
          keyStore.group.addAuthor(groupId_A, '@mix', (err) => {
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
      const groupId_A = GroupId()
      const groupId_B = GroupId()
      const keyA = GroupKey()
      const keyB = GroupKey()
      const initialMsg_A = MessageId()
      const initialMsg_B = MessageId()

      const authorId = generate().id

      keyStore.group.add(groupId_A, { key: keyA, initialMsg: initialMsg_A }, (_, __) => {
        keyStore.group.add(groupId_B, { key: keyB, initialMsg: initialMsg_B }, (_, __) => {
          keyStore.group.addAuthor(groupId_A, authorId, (_, __) => {
            keyStore.group.addAuthor(groupId_B, authorId, (_, __) => {
              const groups = keyStore.author.groups(authorId)
              t.deepEqual(groups, [groupId_A, groupId_B], DESCRIPTION)

              keyStore.close()
            })
          })
        })
      })
    },

    () => {
      const DESCRIPTION = 'group.addAuthor + author.groupKeys'

      const keyStore = KeyStore(TmpPath(), myKeys, null, { loadState: false })
      const groupId_A = GroupId()
      const groupId_B = GroupId()
      const keyA = GroupKey()
      const keyB = GroupKey()
      const initialMsg_A = MessageId()
      const initialMsg_B = MessageId()

      const authorId = generate().id

      keyStore.group.add(groupId_A, { key: keyA, initialMsg: initialMsg_A }, (err, __) => {
        if (err) throw err
        keyStore.group.add(groupId_B, { key: keyB, initialMsg: initialMsg_B }, (err, __) => {
          if (err) throw err
          keyStore.group.addAuthor(groupId_A, authorId, (_, __) => {
            keyStore.group.addAuthor(groupId_B, authorId, (_, __) => {
              const keys = keyStore.author.groupKeys(authorId)
              const expected = [
                { key: keyA, initialMsg: initialMsg_A, scheme: SCHEMES.private_group },
                { key: keyB, initialMsg: initialMsg_B, scheme: SCHEMES.private_group }
              ]
              t.deepEqual(keys, expected, DESCRIPTION)

              keyStore.close()
            })
          })
        })
      })
    },

    () => {
      const DESCRIPTION = 'author.groupKeys (no groups)'

      const keyStore = KeyStore(TmpPath(), myKeys, null, { loadState: false })
      const groupId_A = GroupId()
      const groupId_B = GroupId()
      const keyA = GroupKey()
      const keyB = GroupKey()
      const initialMsg_A = MessageId()
      const initialMsg_B = MessageId()

      const authorId = generate().id
      const otherAuthorId = generate().id

      keyStore.group.add(groupId_A, { key: keyA, initialMsg: initialMsg_A }, (err, __) => {
        if (err) throw err
        keyStore.group.add(groupId_B, { key: keyB, initialMsg: initialMsg_B }, (err, __) => {
          if (err) throw err
          keyStore.group.addAuthor(groupId_A, authorId, (_, __) => {
            keyStore.group.addAuthor(groupId_B, authorId, (_, __) => {
              const keys = keyStore.author.groupKeys(otherAuthorId)
              const expected = []
              t.deepEqual(keys, expected, DESCRIPTION)

              keyStore.close()
            })
          })
        })
      })
    },

    () => {
      const DESCRIPTION = 'author.groupKeys works after persistence (and ready())'

      const storePath = TmpPath()
      const keyStore = KeyStore(storePath, myKeys, null, { loadState: false })
      const groupId_A = GroupId()
      const groupId_B = GroupId()
      const keyA = GroupKey()
      const keyB = GroupKey()
      const initialMsg_A = MessageId()
      const initialMsg_B = MessageId()

      const authorId = generate().id

      keyStore.group.add(groupId_A, { key: keyA, initialMsg: initialMsg_A }, (err, __) => {
        if (err) throw err
        keyStore.group.add(groupId_B, { key: keyB, initialMsg: initialMsg_B }, (err, __) => {
          if (err) throw err
          keyStore.group.addAuthor(groupId_A, authorId, (_, __) => {
            keyStore.group.addAuthor(groupId_B, authorId, (_, __) => {
              keyStore.close(() => {
                // start new keyStore with same path, and this time wait for onReady
                const newKeyStore = KeyStore(storePath, myKeys, () => {
                  // then check to see if keys were persisted

                  const compare = (a, b) => a.key < b.key ? -1 : 1
                  const keys = newKeyStore.author.groupKeys(authorId)
                  const expected = [
                    { key: keyA, initialMsg: initialMsg_A, scheme: SCHEMES.private_group },
                    { key: keyB, initialMsg: initialMsg_B, scheme: SCHEMES.private_group }
                  ]
                  t.deepEqual(keys.sort(compare), expected.sort(compare), DESCRIPTION)

                  newKeyStore.close()
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

      const otherKeys = generate() // some other feed

      const expectedDMKey = directMessageKey.easy(myKeys)(otherKeys.id)

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

  const toRun = tests.length

  t.plan(toRun)
  tests
    .slice(0, toRun)
    // .slice(5, 6)
    .forEach(i => i())
})
