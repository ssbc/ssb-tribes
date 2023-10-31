const test = require('tape')
const { promisify: p } = require('util')
const { Server } = require('../helpers')
const { tanglePrune } = require('../../lib')

const chars = 'abcABC123=+? '.split('')
const randomChar = () => chars.sort(() => Math.random() < 0.5 ? -1 : +1)[0]
const randomText = (length) => {
  let output = ''
  while (output.length < length) output += randomChar()
  return output
}

test('lib/tangle-prune', async t => {
  const ssb = Server()

  const { groupId } = await p(ssb.tribes.create)({})

  const publishSize = async (size, recpCount = 1) => {
    const content = {
      type: 'post',
      text: randomText(size),
      recps: [groupId, ...new Array(recpCount - 1).fill(ssb.id)]
    }

    return new Promise((resolve, reject) => {
      ssb.tribes.publish(content, (err, msg) => {
        if (err) return resolve(false)

        ssb.get({ id: msg.key, private: true }, (err, msgVal) => {
          if (err) return reject(err)
          const plainLength = JSON.stringify(msgVal.content).length
          resolve(plainLength)
        })
      })
    })
  }

  async function findMaxSize (numberRecps = 1) {
    // Apply bisection method to find max size of a message which can be published

    let lower = 4000
    let mid
    let upper = 8000

    const results = new Map([])

    // let i = 0
    while (upper - lower > 1) {
      mid = Math.ceil((lower + upper) / 2)

      if (!results.has(lower)) {
        const res = results.get(lower) || await publishSize(lower, numberRecps)
        results.set(lower, res)
      }

      if (!results.has(mid)) {
        const res = results.get(mid) || await publishSize(mid, numberRecps)
        results.set(mid, res)
      }
      if (!results.has(upper)) {
        const res = results.get(upper) || await publishSize(upper, numberRecps)
        results.set(upper, res)
      }

      // console.log(i++, {
      //   [lower]: results.get(lower),
      //   [mid]: results.get(mid),
      //   [upper]: results.get(upper)
      // })

      if (Boolean(results.get(lower)) !== Boolean(results.get(mid))) upper = mid
      else if (Boolean(results.get(mid)) !== Boolean(results.get(upper))) lower = mid
      else throw new Error('bisection fail')
    }

    const result = results.get(upper) || results.get(mid) || results.get(lower)
    t.pass(`max stringied content size for ${numberRecps} recps:  ${result}`)
  }
  // 16 recps: 5318
  // 1 recps: 5799
  await findMaxSize(16) // 5320
  await findMaxSize(1) // 5800
  ssb.close()

  const msgId = '%RDORgMCjmL6vs51nR4bn0LWNe6wkBfbRJulSdOJsmwg=.sha256'
  const content = (prevCount) => ({
    type: 'post',
    text: 'hello!',
    recps: ['A'],
    tangles: {
      group: {
        root: msgId,
        previous: new Array(prevCount).fill(msgId)
      }
    }
  })

  // console.time('prune')
  let result = tanglePrune(content(4000), 'group', 5320)
  // console.timeEnd('prune')
  t.true(JSON.stringify(result).length <= 5320, `pruned ${4000 - result.tangles.group.previous.length}`)

  result = tanglePrune(content(4000))
  t.true(JSON.stringify(result).length <= 5800, `pruned ${4000 - result.tangles.group.previous.length}`)

  t.end()
})
