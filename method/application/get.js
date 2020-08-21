const pull = require('pull-stream')
const { isRoot, isUpdate } = require('../../spec/application')

module.exports = function GroupApplicationGet (server) {
  return function groupApplicationGet (applicationId, cb) {
    server.get({ id: applicationId, private: true, meta: true }, (err, root) => {
      if (err) return cb(err)
      if (!isRoot(root)) {
        console.log(JSON.stringify(root, null, 2))
        console.log('not a valid appliction root')
        return cb(isRoot.errors)
      }

      fetchUpdates(applicationId, (err, updates) => {
        if (err) return cb(err)

        var initialState = {
          comments: [getComment(root)],
          addMember: []
        }
        const reduced = updates.reduce((acc, curr) => {
          acc.comments.push(getComment(curr))
          acc.addMember = [
            ...acc.addMember,
            ...getAddMember(curr.value)
          ]

          return acc
        }, initialState)

        cb(null, {
          id: applicationId,
          applicantId: root.value.author,
          groupId: root.value.content.groupId,
          groupAdmins: root.value.content.recps.filter(id => id !== root.value.author),
          ...reduced
        })
      })
    })
  }

  function fetchUpdates (applicationId, cb) {
    const query = [
      {
        $filter: {
          dest: applicationId,
          value: {
            content: {
              tangles: {
                application: { root: applicationId }
              }
            }
          }
        }
      }
    ]

    pull(
      server.backlinks.read({ query }),
      pull.filter(m => isUpdate(m)),
      pull.collect(cb)
    )
  }
}

function getComment (msg) {
  const { comment, addMember } = msg.value.content
  let text = ''
  if (comment && comment.append) {
    text = comment.append
  }
  if (!text && addMember && Object.keys(addMember).length) {
    text = 'application accepted'
  }

  return {
    authorId: msg.value.author,
    text
  }
}

function getAddMember (value) {
  if (!value.content.addMember || !Object.keys(value.content.addMember).length) {
    return []
  }

  return Object.keys(value.content.addMember)
}
