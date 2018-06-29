'use strict'

var test = require('tape')
var fromArray = require('from2-array')

function createStream () {
  return fromArray.obj([1,2,3])
}

require('./readable').all(test, createStream)
