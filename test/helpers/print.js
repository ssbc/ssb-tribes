/* eslint-disable camelcase */

const fs = require('fs')
const { join, dirname } = require('path')
const error_codes = require('envelope-spec/error_codes.json')
const encodeLeaves = require('./encode-leaves')

module.exports = function print (relativeFilePath, vector) {
  if (vector.error_code) {
    if (!(vector.error_code in error_codes)) {
      throw new Error(`invalid error_code code: "${vector.error_code}", see envelope-spec/constants.json`)
    }
  }

  const output = JSON.stringify(encodeLeaves(vector), null, 2)
  const filePath = join(__dirname, '../generate', relativeFilePath)

  fs.mkdir(dirname(filePath), { recursive: true }, (err) => {
    if (err) throw err

    fs.writeFile(filePath, output, (err) => {
      if (err) throw err
    })
  })

  console.log()
  console.log('# private-groups-spec/' + relativeFilePath)
  console.log(output)
  console.log()
}
