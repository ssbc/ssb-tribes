const na = require('sodium-native')

// This is for:
// - converting ssb key sets to buffers
//
// this is simple but occurs a lot, so putting nice checks in here for sanity and
// using a similar API to other helpers

module.exports = class FeedKeys {
  constructor (keys) {
    if (!isValid(keys.private) || !isValid(keys.public)) {
      throw new Error('FeedKeys expects { public: <base64>.ed25519, private: <base64>.ed25119 }')
    }

    this.public = bufferize(keys.public)
    if (this.public.length !== na.crypto_sign_PUBLICKEYBYTES) {
      throw new Error(`FeedKeys expected public key of ${na.crypto_sign_PUBLICKEYBYTES}, got ${this.public.length}`)
    }

    this.secret = bufferize(keys.private)
    if (this.secret.length !== na.crypto_sign_SECRETKEYBYTES) {
      throw new Error(`FeedKeys expected secret key of ${na.crypto_sign_SECRETKEYBYTES}, got ${this.secret.length}`)
    }
  }

  toBuffer () {
    return {
      public: this.public,
      secret: this.secret,
      private: this.secret
    }
  }
}

function isValid (t) {
  return (
    typeof t === 'string' &&
    t.endsWith('.ed25519')
  )
}

function bufferize (str) {
  return Buffer.from(str.replace('.ed25519', ''), 'base64')
}
