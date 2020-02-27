const { FeedId, MsgId, GroupId } = require('../../lib/cipherlinks')
const { GroupKey, print } = require('../helpers')

// TODO change this is to use cloaked-id from envelope-spec
const generators = [
  (i) => {
    const init_msg = new MsgId().mock()
    const group_key = GroupKey()

    const vector = {
      type: 'group_id',
      description: 'generate a group id',
      input: {
        group_init_msg_id: init_msg.toSSB(),
        group_key: group_key
      },
      output: {
        group_id: new GroupId(init_msg.toTFK(), group_key).toSSB()
      }
    }
    print(`group-id${i + 1}.json`, vector)
  }
]

generators.forEach((fn, i) => fn(i))
