const bfe = require('ssb-bfe')
const { DiffieHellmanKeys } = require('ssb-private-group-keys')

// NOTE this is in lib/ because it does not write anything to your log
module.exports = {
  generate () {
    const dhKeys = new DiffieHellmanKeys().generate().toBuffer()
    const poBoxId = bfe.decode(
      Buffer.concat([
        bfe.toTF('identity', 'po-box'),
        dhKeys.public
      ])
    )

    return { ...dhKeys, id: poBoxId }
  }
}
