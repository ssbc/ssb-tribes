// WIP

// TODO add our shared DM key to set returned from key-store author.getKeys
// TODO make sure there's a cache!

// const whoami = {
//   // public: Buffer.from(ssb.whoami().public, 'base64')
//   private: Buffer.from(ssb.whoami().private, 'base64')
// }
// var secretKey = Bufer.alloc(na.crypto_box_PRIVATEKEYBYTES)
// // might be na.crypto_scalarmult_curve25519_BYTES
// na.crypto_sign_ed25519_sk_to_curve25519(secretKey, whoami.private)

// var remotePublicKey = Bufer.alloc(na.crypto_box_PUBLICKEYBYTES)
// na.crypto_sign_ed25519_pk_to_curve25519(remotePublicKey, new FeedId(authorId).toBuffer())

// const sharedSecret = Buffer.alloc(na.crypto_scalarmult_BYTES)
// na.crypto_scalarmult(sharedSecret, secretKey, remotePublicKey)

