const bfe = require('ssb-bfe')
const { DiffieHellmanKeys } = require('ssb-private-group-keys')

module.exports = function POBox (ssb, keystore) {
  return {
    create (opts, cb) {
      const dhKeys = new DiffieHellmanKeys().generate().toBuffer()
      const poBoxId = bfe.decode(
        Buffer.concat([
          bfe.toTF('identity', 'po-box'),
          dhKeys.public
        ])
      )

      keystore.poBox.register(poBoxId, { key: dhKeys.secret }, (err) => {
        if (err) return cb(err)

        cb(null, { poBoxId, poBoxKey: dhKeys.secret })
      })
    }
  }
}
