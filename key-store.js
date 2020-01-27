const fs = require('fs')
const { join } = require('path')

module.exports = function KeyStore (ssb, config) {
  const storePath = join(config.path, 'private2/key-store.json')
  var store = 'loading'

  loadStore()

  return {
    add,
    list,
    remove
  }

  function add (input, cb) {
    if (store === 'loading') {
      return setTimeout(() => add(input, cb), 500)
    }

    const { groupId, groupKey } = input

    store[groupId] = groupKey
    saveStore((err) => err ? cb(err) : cb(null, true))
  }

  function list (cb) {
    if (store === 'loading') {
      return setTimeout(() => list(cb), 500)
    }

    cb(null, store)
  }

  function remove (groupId, cb) {
    if (store === 'loading') {
      return setTimeout(() => remove(groupId, cb), 500)
    }

    delete store[groupId]
    saveStore((err) => err ? cb(err) : cb(null, true))
  }

  function loadStore () {
    fs.mkdir(join(config.path, 'private2'), (err) => {
      if (err) throw err

      fs.readFile(storePath, 'utf-8', (err, data) => {
        if (err) {
          if (!err.message.startsWith('ENOENT: no such file')) throw err

          store = []
          return
        }

        store = decode(data)
      })
    })
  }

  function saveStore (cb) {
    fs.writeFile(storePath, encode(store), cb)
  }
}

function encode (store) {
  return JSON.stringify(store, null, 2)
}

function decode (string) {
  return JSON.parse(string)
}
