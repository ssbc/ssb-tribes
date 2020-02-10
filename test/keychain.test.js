const test = require('tape')
const Keychain = require('../keychain')

test('keychain', t => {
  const path = `/tmp/keychain-${Date.now()}`

  const keychain = Keychain(path)

  keychain.group.add('groupId_A', 'groupKey_A', (err, data) =>{
    console.log(err, data)
    keychain.group.list((err, data) => {
      t.deepEqual(data, { groupId_A: 'groupKey_A' }, 'group.add')

      keychain.close()
      t.end()
    })
  })
})
