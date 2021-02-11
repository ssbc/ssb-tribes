const pull = require('pull-stream')
const paraMap = require('pull-paramap')
const { isCloakedMsg: isGroup } = require('ssb-ref')

module.exports = 
