/* eslint-disable camelcase */

const test = require('tape')
const { keySchemes } = require('private-group-spec')
const { generate } = require('ssb-keys')

const KeyStore = require('../key-store')
const { GroupKey, GroupId, FeedId, MsgId } = require('./helpers')
const { directMessageKey } = require('ssb-private-group-keys')

let i = 0
function TmpPath () {
  return `/tmp/key-store-${Date.now()}-${i++}`
}

test('key-store', t => {
  const myKeys = generate() // some ssb-keys

  const tests = [
    () => {
      const DESCRIPTION = 'group.register (error if bad groupId)'

      const keyStore = KeyStore(TmpPath(), myKeys)

      keyStore.group.register('junk', { key: GroupKey(), root: MsgId() }, (err) => {
        t.match(err && err.message, /expected a groupId/, DESCRIPTION)
        keyStore.close()
      })
    },

    () => {
      const DESCRIPTION = 'group.register (error if bad key)'

      const keyStore = KeyStore(TmpPath(), myKeys)

      keyStore.group.register(GroupId(), { key: 'junk', root: MsgId() }, (err) => {
        t.match(err && err.message, /invalid groupKey/, DESCRIPTION)
        keyStore.close()
      })
    },

    () => {
      const DESCRIPTION = 'group.register (error if bad root)'

      const keyStore = KeyStore(TmpPath(), myKeys)

      keyStore.group.register(GroupId(), { key: GroupKey(), root: 'dog' }, (err) => {
        t.match(err && err.message, /expects root/, DESCRIPTION)
        keyStore.close()
      })
    },

    () => {
      const DESCRIPTION = 'group.register (error if try to double-add)'

      const keyStore = KeyStore(TmpPath(), myKeys, null, { loadState: false })
      const groupId = GroupId()
      const key = GroupKey()
      const root = MsgId()

      keyStore.group.register(groupId, { key, root }, (_, data) => {
        keyStore.group.register(groupId, { key, root }, (err) => {
          t.match(err && err.message, /key-store already contains group/, DESCRIPTION)
          keyStore.close()
        })
      })
    },

    () => {
      const DESCRIPTION = 'group.register + group.get'

      const keyStore = KeyStore(TmpPath(), myKeys, null, { loadState: false })
      const groupId = GroupId()
      const key = GroupKey()
      const root = MsgId()

      keyStore.group.register(groupId, { key, root }, (_, data) => {
        const info = keyStore.group.get(groupId)
        t.deepEqual(info, { key, root, scheme: keySchemes.private_group }, DESCRIPTION)

        keyStore.close()
      })
    },

    () => {
      const DESCRIPTION = 'group.register + group.readPersisted'

      const keyStore = KeyStore(TmpPath(), myKeys, null, { loadState: false })
      const groupId = GroupId()
      const key = GroupKey()
      const root = MsgId()

      keyStore.group.register(groupId, { key, root }, (err, data) => {
        if (err) throw err

        keyStore.group.readPersisted((err, data) => {
          if (err) throw err
          t.deepEqual(
            data,
            { [groupId]: { key, root, scheme: keySchemes.private_group } },
            DESCRIPTION
          )

          keyStore.close()
        })
      })
    },

    () => {
      const DESCRIPTION = 'group.registerAuthor (not a feedId errors)'

      const keyStore = KeyStore(TmpPath(), myKeys)
      const groupId_A = GroupId()
      const groupId_B = GroupId()
      const keyA = GroupKey()
      const keyB = GroupKey()
      const root_A = MsgId()
      const root_B = MsgId()

      keyStore.group.registerAuthor(groupId_A, { key: keyA, root: root_A }, (_, __) => {
        keyStore.group.registerAuthor(groupId_B, { key: keyB, root: root_B }, (_, __) => {
          keyStore.group.registerAuthor(groupId_A, '@mix', (err) => {
            // console.log('ERRROR', err)
            t.true(err, DESCRIPTION)
            keyStore.close()
          })
        })
      })
    },

    () => {
      const DESCRIPTION = 'group.registerAuthor + author.groups'

      const keyStore = KeyStore(TmpPath(), myKeys)
      const groupId_A = GroupId()
      const groupId_B = GroupId()
      const keyA = GroupKey()
      const keyB = GroupKey()
      const root_A = MsgId()
      const root_B = MsgId()

      const authorId = generate().id

      keyStore.group.register(groupId_A, { key: keyA, root: root_A }, (_, __) => {
        keyStore.group.register(groupId_B, { key: keyB, root: root_B }, (_, __) => {
          keyStore.group.registerAuthor(groupId_A, authorId, (_, __) => {
            keyStore.group.registerAuthor(groupId_B, authorId, (_, __) => {
              const groups = keyStore.author.groups(authorId)
              t.deepEqual(groups, [groupId_A, groupId_B], DESCRIPTION)

              keyStore.close()
            })
          })
        })
      })
    },

    () => {
      const DESCRIPTION = 'group.registerAuthor + author.groupKeys'

      const keyStore = KeyStore(TmpPath(), myKeys, null, { loadState: false })
      const groupId_A = GroupId()
      const groupId_B = GroupId()
      const keyA = GroupKey()
      const keyB = GroupKey()
      const root_A = MsgId()
      const root_B = MsgId()

      const authorId = generate().id

      keyStore.group.register(groupId_A, { key: keyA, root: root_A }, (err, __) => {
        if (err) throw err
        keyStore.group.register(groupId_B, { key: keyB, root: root_B }, (err, __) => {
          if (err) throw err
          keyStore.group.registerAuthor(groupId_A, authorId, (_, __) => {
            keyStore.group.registerAuthor(groupId_B, authorId, (_, __) => {
              const keys = keyStore.author.groupKeys(authorId)
              const expected = [
                { key: keyA, root: root_A, scheme: keySchemes.private_group },
                { key: keyB, root: root_B, scheme: keySchemes.private_group }
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
      const root_A = MsgId()
      const root_B = MsgId()

      const authorId = generate().id
      const otherAuthorId = generate().id

      keyStore.group.register(groupId_A, { key: keyA, root: root_A }, (err, __) => {
        if (err) throw err
        keyStore.group.register(groupId_B, { key: keyB, root: root_B }, (err, __) => {
          if (err) throw err
          keyStore.group.registerAuthor(groupId_A, authorId, (_, __) => {
            keyStore.group.registerAuthor(groupId_B, authorId, (_, __) => {
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
      const root_A = MsgId()
      const root_B = MsgId()

      const authorId = generate().id

      keyStore.group.register(groupId_A, { key: keyA, root: root_A }, (err, __) => {
        if (err) throw err
        keyStore.group.register(groupId_B, { key: keyB, root: root_B }, (err, __) => {
          if (err) throw err
          keyStore.group.registerAuthor(groupId_A, authorId, (_, __) => {
            keyStore.group.registerAuthor(groupId_B, authorId, (_, __) => {
              keyStore.close(() => {
                // start new keyStore with same path, and this time wait for onReady
                const newKeyStore = KeyStore(storePath, myKeys, () => {
                  // then check to see if keys were persisted

                  const compare = (a, b) => a.key < b.key ? -1 : 1
                  const keys = newKeyStore.author.groupKeys(authorId)
                  const expected = [
                    { key: keyA, root: root_A, scheme: keySchemes.private_group },
                    { key: keyB, root: root_B, scheme: keySchemes.private_group }
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
          scheme: keySchemes.feed_id_dm
        },
        DESCRIPTION
      )
      keyStore.close()
    },

    () => {
      const DESCRIPTION = 'ownKeys (persisted)'

      const storePath = TmpPath()
      let keyStore = KeyStore(storePath, myKeys, null, { loadState: false })

      const keys = keyStore.ownKeys()

      keyStore.close((err) => {
        if (err) throw err
        keyStore = KeyStore(storePath, myKeys, () => {
          t.deepEqual(keyStore.ownKeys(), keys, DESCRIPTION)
          keyStore.close()
        })
      })
    },

    // ## processAddMember
    //
    // this method handles incoming group/add-member messages
    // it takes care of :
    // - making sure group details are registered
    // - making sure authors are associated with groups
    // - telling us which authors are new (so that we can elsewhere trigger index rebuilds)
    //
    // if there are no new author registrations, return []
    // if there *are* author registrations, return array of new authors
    //
    // - check if group ID is already registered
    //   - check if the details (group key, root) are the same
    //
    // CALLBACK
    //
    // The list of authors that you need to rebuild, because they're
    // added to a group that you have the key for (and this is the first time
    // you're hearing about it).

    () => {
      const DESCRIPTION = 'processAddMember (brand new group and members)'
      const storePath = TmpPath()
      const keyStore = KeyStore(storePath, myKeys, null, { loadState: false })

      const authors = [FeedId()]
      const args = {
        groupId: GroupId(),
        groupKey: GroupKey(),
        root: MsgId(),
        authors
      }

      keyStore.processAddMember(args, (err, result) => {
        if (err) throw err
        t.deepEqual(result, authors, DESCRIPTION)
        keyStore.close()
      })
    },

    () => {
      const DESCRIPTION = 'processAddMember (adding authors to existing group)'
      const storePath = TmpPath()
      const keyStore = KeyStore(storePath, myKeys, null, { loadState: false })

      const args = {
        groupId: GroupId(),
        groupKey: GroupKey(),
        root: MsgId(),
        authors: [FeedId()]
      }
      const newAuthor = FeedId()

      keyStore.processAddMember(args, (err) => {
        if (err) throw err
        // simulate duplicate, slightly different group/add-member
        args.authors.push(newAuthor)
        keyStore.processAddMember(args, (err, result) => {
          if (err) throw err
          t.deepEqual(result, [newAuthor], DESCRIPTION)
          keyStore.close()
        })
      })
    },

    () => {
      const DESCRIPTION = 'processAddMember (adding authors to existing group - no new info)'
      const storePath = TmpPath()
      const keyStore = KeyStore(storePath, myKeys, null, { loadState: false })

      const args = {
        groupId: GroupId(),
        groupKey: GroupKey(),
        root: MsgId(),
        authors: [FeedId()]
      }

      keyStore.processAddMember(args, (err) => {
        if (err) throw err
        // simulate duplicate, slightly different group/add-member
        args.authors.push(FeedId())
        keyStore.processAddMember(args, (err) => {
          if (err) throw err

          // run the same add again (so no new group/ authors)
          // running 3 processAddMember tests how persistence is behaving (maybe?)
          keyStore.processAddMember(args, (err, result) => {
            if (err) throw err
            t.deepEqual(result, [], DESCRIPTION)
            keyStore.close()
          })
        })
      })
    },

    () => {
      const DESCRIPTION = 'processAddMember (same groupId with different groupKey Errors)'
      const storePath = TmpPath()
      const keyStore = KeyStore(storePath, myKeys, null, { loadState: false })

      const args = {
        groupId: GroupId(),
        groupKey: GroupKey(),
        root: MsgId(),
        authors: [FeedId()]
      }

      keyStore.processAddMember(args, (err) => {
        if (err) throw err
        // simulate malicious add
        args.groupKey = GroupKey()
        keyStore.processAddMember(args, (err) => {
          t.match(
            err.message,
            /groupId [^\s]+ already registered with a different groupKey/,
            DESCRIPTION
          )
          keyStore.close()
        })
      })
    },

    () => {
      const DESCRIPTION = 'processAddMember (same groupId with different root Errors)'
      const storePath = TmpPath()
      const keyStore = KeyStore(storePath, myKeys, null, { loadState: false })

      const args = {
        groupId: GroupId(),
        groupKey: GroupKey(),
        root: MsgId(),
        authors: [FeedId()]
      }

      keyStore.processAddMember(args, (err) => {
        if (err) throw err
        // simulate malicious add
        args.root = MsgId()
        keyStore.processAddMember(args, (err) => {
          t.match(
            err.message,
            /groupId [^\s]+ already registered with a different root/,
            DESCRIPTION
          )
          keyStore.close()
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
