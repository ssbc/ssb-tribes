const test = require('tape')
const SCHEMES = require('private-group-spec/key-schemes.json').scheme
const { generate } = require('ssb-keys')

const KeyStore = require('../key-store')
const { GroupKey, GroupId } = require('./helpers')
const directMessageKey = require('../lib/direct-message-key')
const { MsgId, FeedId: _FeedId } = require('../lib/cipherlinks')

function MessageId () {
  return new MsgId().mock().toSSB()
}

function FeedId () {
  return new _FeedId().mock().toSSB()
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

      keyStore.group.add('junk', { key: GroupKey(), root: MessageId() }, (err) => {
        t.match(err && err.message, /expected a groupId/, DESCRIPTION)
        keyStore.close()
      })
    },

    () => {
      const DESCRIPTION = 'group.add (error if bad key)'

      const keyStore = KeyStore(TmpPath(), myKeys)

      keyStore.group.add(GroupId(), { key: 'junk', root: MessageId() }, (err) => {
        t.match(err && err.message, /invalid groupKey/, DESCRIPTION)
        keyStore.close()
      })
    },

    () => {
      const DESCRIPTION = 'group.add (error if bad root)'

      const keyStore = KeyStore(TmpPath(), myKeys)

      keyStore.group.add(GroupId(), { key: GroupKey(), root: 'dog' }, (err) => {
        t.match(err && err.message, /expects root/, DESCRIPTION)
        keyStore.close()
      })
    },

    () => {
      const DESCRIPTION = 'group.add (error if try to double-add)'

      const keyStore = KeyStore(TmpPath(), myKeys, null, { loadState: false })
      const groupId = GroupId()
      const key = GroupKey()
      const root = MessageId()

      keyStore.group.add(groupId, { key, root }, (_, data) => {
        keyStore.group.add(groupId, { key, root }, (err) => {
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
      const root = MessageId()

      keyStore.group.add(groupId, { key, root }, (_, data) => {
        const info = keyStore.group.get(groupId)
        t.deepEqual(info, { key, root, scheme: SCHEMES.private_group }, DESCRIPTION)

        keyStore.close()
      })
    },

    () => {
      const DESCRIPTION = 'group.add + group.readPersisted'

      const keyStore = KeyStore(TmpPath(), myKeys, null, { loadState: false })
      const groupId = GroupId()
      const key = GroupKey()
      const root = MessageId()

      keyStore.group.add(groupId, { key, root }, (err, data) => {
        if (err) throw err

        keyStore.group.readPersisted((err, data) => {
          if (err) throw err
          t.deepEqual(
            data,
            { [groupId]: { key, root, scheme: SCHEMES.private_group } },
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
      const root_A = MessageId()
      const root_B = MessageId()

      keyStore.group.add(groupId_A, { key: keyA, root: root_A }, (_, __) => {
        keyStore.group.add(groupId_B, { key: keyB, root: root_B }, (_, __) => {
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
      const root_A = MessageId()
      const root_B = MessageId()

      const authorId = generate().id

      keyStore.group.add(groupId_A, { key: keyA, root: root_A }, (_, __) => {
        keyStore.group.add(groupId_B, { key: keyB, root: root_B }, (_, __) => {
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
      const root_A = MessageId()
      const root_B = MessageId()

      const authorId = generate().id

      keyStore.group.add(groupId_A, { key: keyA, root: root_A }, (err, __) => {
        if (err) throw err
        keyStore.group.add(groupId_B, { key: keyB, root: root_B }, (err, __) => {
          if (err) throw err
          keyStore.group.addAuthor(groupId_A, authorId, (_, __) => {
            keyStore.group.addAuthor(groupId_B, authorId, (_, __) => {
              const keys = keyStore.author.groupKeys(authorId)
              const expected = [
                { key: keyA, root: root_A, scheme: SCHEMES.private_group },
                { key: keyB, root: root_B, scheme: SCHEMES.private_group }
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
      const root_A = MessageId()
      const root_B = MessageId()

      const authorId = generate().id
      const otherAuthorId = generate().id

      keyStore.group.add(groupId_A, { key: keyA, root: root_A }, (err, __) => {
        if (err) throw err
        keyStore.group.add(groupId_B, { key: keyB, root: root_B }, (err, __) => {
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
      const root_A = MessageId()
      const root_B = MessageId()

      const authorId = generate().id

      keyStore.group.add(groupId_A, { key: keyA, root: root_A }, (err, __) => {
        if (err) throw err
        keyStore.group.add(groupId_B, { key: keyB, root: root_B }, (err, __) => {
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
                    { key: keyA, root: root_A, scheme: SCHEMES.private_group },
                    { key: keyB, root: root_B, scheme: SCHEMES.private_group }
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
    },

    // add all authors
    // - author of invite message
    //   - all listed recipients of invite message
    //
    // if there are no new author registrations, return []
    // if there *are* author registrations, return array of new authors
    //
    // - check if group ID is already registered
    //   - check if the details (group key, root) are the same
    //
    //
    // RETURNS
    //
    // The list of authors that you need to rebuild, because they're
    // added to a group that you have the key for (and this is the first time
    // you're hearing about it).
    //
    // TEST CASES
    //
    // - happy path: brand new group ID, not in keystore
    // - other happy path: group ID exists with same details
    // - another happy path: we already know about group ID and authors
    // - unhappy path: group ID exists and (somehow) has the wrong **group key**
    () => {
      const DESCRIPTION = 'processAddMember (brand new group and members)'
      const storePath = TmpPath()
      const keyStore = KeyStore(storePath, myKeys, null, { loadState: false })

      const authors = [FeedId()]

      keyStore.processAddMember({
        groupId: GroupId(),
        groupKey: GroupKey(),
        root: MessageId(),
        authors
      }, (err, result) => {
        if (err) throw err
        t.deepEqual(result, authors, DESCRIPTION)
      })
    },

    () => {
      const DESCRIPTION = 'processAddMember (add our second member to group'
      const storePath = TmpPath()
      const keyStore = KeyStore(storePath, myKeys, null, { loadState: false })

      const authors = [FeedId()]

      const args = {
        groupId: GroupId(),
        groupKey: GroupKey(),
        root: MessageId(),
        authors
      }

      keyStore.processAddMember(args, (err) => {
        if (err) throw err
        const newAuthor = FeedId()
        args.authors.push(newAuthor)
        keyStore.processAddMember(args, (err, result) => {
          if (err) throw err
          t.deepEqual(result, [newAuthor], DESCRIPTION)
        })
      })
    },
    () => {
      const DESCRIPTION = 'processAddMember (did not add new member to group)'
      const storePath = TmpPath()
      const keyStore = KeyStore(storePath, myKeys, null, { loadState: false })

      const authors = [FeedId()]

      const args = {
        groupId: GroupId(),
        groupKey: GroupKey(),
        root: MessageId(),
        authors
      }

      keyStore.processAddMember(args, (err) => {
        if (err) throw err
        const newAuthor = FeedId()
        args.authors.push(newAuthor)
        keyStore.processAddMember(args, (err) => {
          if (err) throw err
          keyStore.processAddMember(args, (err, result) => {
            if (err) throw err
            t.deepEqual(result, [], DESCRIPTION)
          })
        })
      })
    }
  ]

  const toRun = tests.length

  t.plan(toRun)
  tests
    .slice(0, toRun)
    .forEach(i => i())
})
