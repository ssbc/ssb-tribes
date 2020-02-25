const na = require('sodium-native')

class SecretKey {
  constructor (length) {
    this.key = na.sodium_malloc(length || na.crypto_secretbox_KEYBYTES)
    na.randombytes_buf(this.key)
  }

  toString (encoding = 'base64') {
    return this.key.tostring(encoding)
  }

  toBuffer () {
    return this.key
  }
}

module.exports = SecretKey
