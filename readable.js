'use strict'

var addSecretListener = require('secret-event-listener')
var ten = process.versions.node.split('.')[0] === '10'
var eof = ten ? require('stream').finished : require('end-of-stream')

exports.all = function (test, createStream) {
  exports.api(test, createStream)
  exports.eof(test, createStream)
  exports.destroy(test, createStream)
}

exports.api = function (test, createStream) {
  // TODO: test that stream does not define non-underscored methods
}

exports.eof = function (test, createStream) {
  test('eof(stream) with resume()', function (t) {
    var stream = createStream()
    var order = monitor(stream)

    eof(stream, delay(function (err) {
      t.ifError(err, 'no eof error')

      if (order[order.length - 1] === 'close') {
        // Close event is optional (unless destroyed)
        t.pass('underlying resource was closed')
        order.pop()
      }

      t.same(order, allowDataEvents(order, []), order.join(', '))
      t.end()
    }))

    stream.resume()
  })

  test('eof(stream) with destroy()', function (t) {
    var stream = createStream()
    var order = monitor(stream)

    eof(stream, delay(function (err) {
      t.is(err && err.message, ten ? 'Premature close' : 'premature close')
      t.same(order, ['close'], order.join(', '))
      t.end()
    }))

    stream.destroy()
  })

  test('eof(stream) with resume() and destroy()', function (t) {
    var stream = createStream()
    var order = monitor(stream)

    eof(stream, delay(function (err) {
      t.is(err && err.message, ten ? 'Premature close' : 'premature close')
      t.same(order, ['close'], order.join(', '))
      t.end()
    }))

    stream.resume()
    stream.destroy()
  })
}

exports.destroy = function (test, createStream) {
  exports.immediateDestroy(test, createStream)
  exports.nextTickDestroy(test, createStream)
}

exports.immediateDestroy = function (test, createStream) {
  exports.customDestroy(test, createStream, 'immediately', function (stream, destroy) {
    destroy()
  })

  exports.customDestroy(test, createStream, 'immediately after resume', function (stream, destroy) {
    stream.resume()
    destroy()
  })
}

exports.nextTickDestroy = function (test, createStream) {
  exports.customDestroy(test, createStream, 'in next tick', function (stream, destroy) {
    process.nextTick(destroy)
  })

  exports.customDestroy(test, createStream, 'in next tick after resume', function (stream, destroy) {
    stream.resume()
    process.nextTick(destroy)
  })
}

exports.customDestroy = function (test, createStream, name, attach) {
  test('destroy() ' + name, function (t) {
    var stream = createStream()

    var order = monitor(stream, function () {
      var expected = allowDataEvents(order, ['close'])
      t.same(order, expected, expected.join(', '))
      t.end()
    })

    attach(stream, function () {
      stream.destroy()
    })
  })

  test('destroy(err) ' + name, function (t) {
    var stream = createStream()

    var order = monitor(stream, function () {
      var expected = allowDataEvents(order, ['error: user', 'close'])
      t.same(order, expected, expected.join(', '))
      t.end()
    })

    attach(stream, function () {
      stream.destroy(new Error('user'))
    })
  })

  // TODO: find out why destroy(err, callback) is undocumented in node.
  test.skip('destroy(err, callback) ' + name, function (t) {
    var stream = createStream()

    var order = monitor(stream, function () {
      var expected = allowDataEvents(order, ['callback', 'close'])
      t.same(order, expected, expected.join(', '))
      t.end()
    })

    attach(stream, function () {
      stream.destroy(new Error('user'), function (err) {
        order.push('callback')
        t.is(err.message, 'user', 'got error')
      })
    })
  })

  test.skip('destroy(null, callback) ' + name, function (t) {
    var stream = createStream()

    var order = monitor(stream, function () {
      var expected = allowDataEvents(order, ['callback', 'close'])
      t.same(order, expected, expected.join(', '))
      t.end()
    })

    attach(stream, function () {
      stream.destroy(null, function (err) {
        order.push('callback')
        t.ifError(err, 'no error')
      })
    })
  })
}

function allowDataEvents (order, expected) {
  if (order.indexOf('end') >= 0) expected.unshift('end')
  var datas = order.filter(function (event) { return event === 'data' })
  expected.unshift.apply(expected, datas)
  return expected
}

function monitor (stream, onEnd) {
  var order = []

  ;['data', 'end', 'error', 'finish', 'close'].forEach(function (event) {
    addSecretListener(stream, event, function (err) {
      // TODO: push all arguments
      if (event === 'error') order.push('error: ' + err.message)
      else order.push(event)
    })
  })

  if (onEnd) {
    // Delay to include a possible "close" event after "end" or "error"
    eof(stream, delay(onEnd))
  }

  return order
}

function delay (fn) {
  return function () {
    var args = arguments

    setImmediate(function () {
      fn.apply(null, args)
    })
  }
}
