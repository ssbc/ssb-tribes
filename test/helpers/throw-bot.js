// this file is used in test/from-old-versions.test.js

const NewBot = require('./test-bot')

const newOpts = {
  name: 'alice',
  startUnclean: true
}

try {
  NewBot(newOpts)
} catch (err) {
  process.send(err.message)
}
