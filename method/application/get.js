const pull = require('pull-stream')
const { isValid } = require('../../spec/application/application')

module.exports = function GroupApplicationGet (server) {
  return function groupApplicationGet (applicationId, cb) {
    const query = [
      {
        $filter: {
          dest: applicationId
        }
      }
    ]

    server.get({ id: applicationId, private: true }, (rootErr, rootData) => {
      if (!isValid(rootData)) {
        return cb(isValid.errors)
      }
      if (rootErr) return cb(rootErr)
      pull(
        server.backlinks.read({ query }),
        pull.filter(m => isValid(m)),
        pull.collect((err, data) => {
          if (err) return cb(err)
          let final = {
            root: applicationId,
            applicantId: rootData.author,
            groupId: rootData.content.groupId,
            recps: rootData.content.recps
          }
          /* If there's only the root message */
          if (!data || data.length < 1) {
            const res = {
              ...final,
              text: [rootData.content.text.append || '']
            }
            return cb(null, res)
          } else {
            const reduced = data.reduce((prev, curr) => {
              /* First message*/
              if (!prev) {
                return {
                  text: [
                    rootData.content.text.append || '',
                    curr.value.content.text.append || ''
                  ],
                  addMember: [curr.value.content.addMember.add]
                }
                /* Other messages */
              } else {
                return {
                  text: [...prev.text, curr.value.content.text.append || ''],
                  addMember: [
                    ...prev.addMember,
                    curr.value.content.addMember.add
                  ]
                }
              }
            }, null)
            cb(null, {
              ...final,
              ...reduced
            })
          }
        })
      )
    })
  }
}
