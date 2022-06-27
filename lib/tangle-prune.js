/* eslint-disable camelcase */
const MAX_SIZE_16_recps = 5320
const MAX_SIZE_1_recps = 5800

module.exports = function tanglePrune (content, tangle = 'group', maxSize) {
  maxSize = maxSize || (content.recps > 1 ? MAX_SIZE_16_recps : MAX_SIZE_1_recps)
  if (getLength(content) <= maxSize) return content

  content.tangles[tangle].previous = content.tangles[tangle].previous
    .sort(() => Math.random() < 0.5 ? -1 : +1)
    // we shuffle so that if multiple peers are also trying to converge,
    // we hopefully tangle differently and converge faster

  while (content.tangles[tangle].previous.length && getLength(content) > maxSize) {
    content.tangles[tangle].previous.pop()
  }

  return content
}

function getLength (obj) {
  return JSON.stringify(obj).length
}
