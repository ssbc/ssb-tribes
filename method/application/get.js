const pull = require('pull-stream')
const { isRoot, isUpdate } = require('../../spec/application')

module.exports = function GroupApplicationGet (server) {
  return function groupApplicationGet (applicationId, cb) {
    server.get({ id: applicationId, private: true }, (err, rootData) => {
      if (err) return cb(err)
      if (!isRoot(rootData)) return cb(isRoot.errors)

      fetchUpdates(applicationId, (err, updates) => {
        if (err) return cb(err)

        var initialState = {
          comments: [getComment(rootData)],
          addMember: []
        }
        const reduced = updates.reduce((acc, curr) => {
          acc.comments.push(getComment(curr.value))
          acc.addMember = [
            ...acc.addMember,
            ...getAddMember(curr.value)
          ]

          return acc
        }, initialState)

        cb(null, {
          id: applicationId,
          applicantId: rootData.author,
          groupId: rootData.content.groupId,
          groupAdmins: rootData.content.recps.filter(id => id !== rootData.author),
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

function getComment (value) {
  let text = ''
  if (value.content.comment && value.content.comment.append) {
    text = value.content.comment.append
  }
  if (!text && value.content.addMember && Object.keys(value.content.addMember).length) {
    text = 'application accepted'
  }

  return {
    author: value.author,
    text
  }
}

function getAddMember (value) {
  if (!value.content.addMember || !Object.keys(value.content.addMember).length) {
    return []
  }

  return Object.keys(value.content.addMember)
}
