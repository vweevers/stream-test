# stream-test

> **Test suite for Node.js stream implementors.** :chicken:  
> Just an idea at this point.

## Usage

```js
var test = require('tape')
var fromArray = require('from2-array')

function createStream () {
  return fromArray.obj([1, 2, 3])
}

require('stream-test/readable').all(test, createStream)
```

## License

[MIT](LICENSE.md) © 2018-present Vincent Weevers
