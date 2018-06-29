'use strict'

var addSecretListener = require('secret-event-listener')

exports.all = function (test, createStream) {
  exports.api(test, createStream)
  exports.destroy(test, createStream)
}

exports.api = function (test, createStream) {
  // TODO: test that stream does not define non-underscored methods
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

function monitor (stream, onClose) {
  var order = []

  ;['data', 'end', 'error', 'finish', 'close'].forEach(function (event) {
    addSecretListener(stream, event, function (err) {
      // TODO: push all arguments
      if (event === 'error') order.push('error: ' + err.message)
      else order.push(event)
    })
  })

  // TODO: close events are optional
  if (onClose) {
    stream.on('close', onClose)
  }

  return order
}
