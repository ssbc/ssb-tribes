const fs = require('fs')
const { join } = require('path')
const { isGroupKey } = require('./util/validators')

// this is very minimal / deliberately ugly
// I want to discuss whether leveldb would be a good store here
// or whether that's too much overhead and we should go something different

module.exports = function KeyStore (ssb, config) {
  const storePath = join(config.path, 'private2/key-store.json')
  var store = 'loading'

  loadStore()

  function add (input, cb) {
    const { groupId, groupKey } = input

    if (!isGroupKey(groupKey)) {
      return cb(new Error('ssb-private2: invalid groupKey'))
    }

    store[groupId] = groupKey
    saveStore((err) => err ? cb(err) : cb(null, true))
  }

  function list (cb) {
    cb(null, store)
  }

  function remove (groupId, cb) {
    delete store[groupId]
    saveStore((err) => err ? cb(err) : cb(null, true))
  }

  return {
    add: onReady(add),
    list: onReady(list),
    remove: onReady(remove)
  }

  /* private */

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

  function onReady (fn) {
    return function check () {
      if (store === 'loading') {
        return setTimeout(() => check.apply(null, arguments), 500)
      }

      fn.apply(null, arguments)
    }
  }
}

function encode (store) {
  return JSON.stringify(store, null, 2)
}

function decode (string) {
  return JSON.parse(string)
}
