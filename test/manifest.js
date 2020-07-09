const tape = require('tape')
const { Server } = require('./helpers')
const { manifest } = require('..')

// The number of methods that we have. This should change with the API.
const methodCount = 8

const isActualObject = (x) =>
  typeof x === 'object' && x !== null && Array.isArray(x) === false

// Iterate through the manifest and ensure that there's a matching entry in the
// actual API.
tape('Manifest methods exist in stack', (t) => {
  t.plan(methodCount)

  const server = Server()

  const walk = (manifestFragment, apiFragment, path) => {
    Object.entries(manifestFragment).forEach(([key, value]) => {
      const newPath = [key, ...path]
      if (typeof value === 'string') {
        t.equal(
          typeof apiFragment[key],
          'function',
          newPath.reverse().join('.')
        )
      } else if (isActualObject(value)) {
        walk(value, apiFragment[key], newPath)
      } else {
        t.fail(`Unknown manifest entry type for ${newPath}`)
      }
    })
  }

  server.close(() => {
    walk(manifest, server.tribes, [])
  })
})

// Inverse of the above test: iterate through the API and ensure that there's a
// matching entry in the manifest.
tape('Stack methods exist in manifest', (t) => {
  t.plan(methodCount)

  const server = Server()

  const methodTypes = ['async', 'source', 'sync', 'duplex']

  const walk = (apiFragment, manifestFragment, path) => {
    Object.entries(apiFragment).forEach(([key, value]) => {
      const newPath = [key, ...path]
      if (typeof value === 'function') {
        t.ok(
          methodTypes.includes(manifestFragment[key]),
          newPath.reverse().join('.')
        )
      } else if (isActualObject(value)) {
        walk(value, manifestFragment[key], newPath)
      } else {
        t.fail(`Unknown manifest entry type for ${newPath}`)
      }
    })
  }

  server.close(() => {
    walk(server.tribes, manifest, [])
  })
})
