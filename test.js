'use strict'

var test = require('tape')
var fromArray = require('from2-array')
var fs = require('fs')

require('./readable').all(test, function createStream () {
  return fromArray.obj([1,2,3])
})

require('./readable').all(test, function createStream () {
  var stream = fromArray.obj([1,2,3])
  stream.on('end', stream.destroy.bind(stream, null, null))
  return stream
})

// This doesn't emit "close" on destroy(err), even in node 10 :(
// require('./readable').all(test, function createStream () {
//   return fs.createReadStream(__filename)
// })
