'use strict'

const { Blob } = require('buffer')
const { types } = require('util')
const { kState } = require('./symbols')
const { isBlobLike } = require('./util')
const { webidl } = require('./webidl')

class File extends Blob {
  constructor (fileBits, fileName, options = {}) {
    // The File constructor is invoked with two or three parameters, depending
    // on whether the optional dictionary parameter is used. When the File()
    // constructor is invoked, user agents must run the following steps:
    if (arguments.length < 2) {
      throw new TypeError('2 arguments required')
    }

    fileBits = webidl.converters['sequence<BlobPart>'](fileBits)
    fileName = webidl.converters.USVString(fileName)
    options = webidl.converters.FilePropertyBag(options)

    // 1. Let bytes be the result of processing blob parts given fileBits and
    // options.
    // Note: Blob handles this for us

    // 2. Let n be the fileName argument to the constructor.
    const n = fileName

    // 3. Process FilePropertyBag dictionary argument by running the following
    // substeps:

    //    1. If the type member is provided and is not the empty string, let t
    //    be set to the type dictionary member. If t contains any characters
    //    outside the range U+0020 to U+007E, then set t to the empty string
    //    and return from these substeps.
    //    2. Convert every character in t to ASCII lowercase.
    // Note: Blob handles both of these steps for us

    //    3. If the lastModified member is provided, let d be set to the
    //    lastModified dictionary member. If it is not provided, set d to the
    //    current date and time represented as the number of milliseconds since
    //    the Unix Epoch (which is the equivalent of Date.now() [ECMA-262]).
    const d = options.lastModified

    // 4. Return a new File object F such that:
    // F refers to the bytes byte sequence.
    // F.size is set to the number of total bytes in bytes.
    // F.name is set to n.
    // F.type is set to t.
    // F.lastModified is set to d.

    super(processBlobParts(fileBits, options), { type: options.type })
    this[kState] = {
      name: n,
      lastModified: d
    }
  }

  get name () {
    if (!(this instanceof File)) {
      throw new TypeError('Illegal invocation')
    }

    return this[kState].name
  }

  get lastModified () {
    if (!(this instanceof File)) {
      throw new TypeError('Illegal invocation')
    }

    return this[kState].lastModified
  }

  get [Symbol.toStringTag] () {
    return this.constructor.name
  }
}

class FileLike {
  constructor (blobLike, fileName, options = {}) {
    // TODO: argument idl type check

    // The File constructor is invoked with two or three parameters, depending
    // on whether the optional dictionary parameter is used. When the File()
    // constructor is invoked, user agents must run the following steps:

    // 1. Let bytes be the result of processing blob parts given fileBits and
    // options.

    // 2. Let n be the fileName argument to the constructor.
    const n = fileName

    // 3. Process FilePropertyBag dictionary argument by running the following
    // substeps:

    //    1. If the type member is provided and is not the empty string, let t
    //    be set to the type dictionary member. If t contains any characters
    //    outside the range U+0020 to U+007E, then set t to the empty string
    //    and return from these substeps.
    //    TODO
    const t = options.type

    //    2. Convert every character in t to ASCII lowercase.
    //    TODO

    //    3. If the lastModified member is provided, let d be set to the
    //    lastModified dictionary member. If it is not provided, set d to the
    //    current date and time represented as the number of milliseconds since
    //    the Unix Epoch (which is the equivalent of Date.now() [ECMA-262]).
    const d = options.lastModified ?? Date.now()

    // 4. Return a new File object F such that:
    // F refers to the bytes byte sequence.
    // F.size is set to the number of total bytes in bytes.
    // F.name is set to n.
    // F.type is set to t.
    // F.lastModified is set to d.

    this[kState] = {
      blobLike,
      name: n,
      type: t,
      lastModified: d
    }
  }

  stream (...args) {
    if (!(this instanceof FileLike)) {
      throw new TypeError('Illegal invocation')
    }

    return this[kState].blobLike.stream(...args)
  }

  arrayBuffer (...args) {
    if (!(this instanceof FileLike)) {
      throw new TypeError('Illegal invocation')
    }

    return this[kState].blobLike.arrayBuffer(...args)
  }

  slice (...args) {
    if (!(this instanceof FileLike)) {
      throw new TypeError('Illegal invocation')
    }

    return this[kState].blobLike.slice(...args)
  }

  text (...args) {
    if (!(this instanceof FileLike)) {
      throw new TypeError('Illegal invocation')
    }

    return this[kState].blobLike.text(...args)
  }

  get size () {
    if (!(this instanceof FileLike)) {
      throw new TypeError('Illegal invocation')
    }

    return this[kState].blobLike.size
  }

  get type () {
    if (!(this instanceof FileLike)) {
      throw new TypeError('Illegal invocation')
    }

    return this[kState].blobLike.type
  }

  get name () {
    if (!(this instanceof FileLike)) {
      throw new TypeError('Illegal invocation')
    }

    return this[kState].name
  }

  get lastModified () {
    if (!(this instanceof FileLike)) {
      throw new TypeError('Illegal invocation')
    }

    return this[kState].lastModified
  }

  get [Symbol.toStringTag] () {
    return 'File'
  }
}

webidl.converters.Blob = webidl.interfaceConverter(Blob)

webidl.converters.BlobPart = function (V, opts) {
  if (webidl.util.Type(V) === 'Object') {
    if (isBlobLike(V)) {
      return webidl.converters.Blob(V, { strict: false })
    }

    return webidl.converters.BufferSource(V, opts)
  } else {
    return webidl.converters.USVString(V, opts)
  }
}

webidl.converters['sequence<BlobPart>'] = webidl.sequenceConverter(
  webidl.converters.BlobPart
)

// https://www.w3.org/TR/FileAPI/#dfn-FilePropertyBag
webidl.converters.FilePropertyBag = webidl.dictionaryConverter([
  {
    key: 'lastModified',
    converter: webidl.converters['long long'],
    get defaultValue () {
      return Date.now()
    }
  },
  {
    key: 'type',
    converter: webidl.converters.DOMString,
    defaultValue: ''
  },
  {
    key: 'endings',
    converter: (value) => {
      value = webidl.converters.DOMString(value)
      value = value.toLowerCase()

      if (value !== 'native') {
        value = 'transparent'
      }

      return value
    },
    defaultValue: 'transparent'
  }
])

/**
 * @see https://www.w3.org/TR/FileAPI/#process-blob-parts
 * @param {(NodeJS.TypedArray|Blob|string)[]} parts
 * @param {{ type: string, endings: string }} options
 */
function processBlobParts (parts, options) {
  // 1. Let bytes be an empty sequence of bytes.
  /** @type {NodeJS.TypedArray[]} */
  const bytes = []

  // 2. For each element in parts:
  for (const element of parts) {
    // 1. If element is a USVString, run the following substeps:
    if (typeof element === 'string') {
      // 1. Let s be element.
      let s = element

      // 2. If the endings member of options is "native", set s
      //    to the result of converting line endings to native
      //    of element.
      if (options.endings === 'native') {
        s = convertLineEndingsNative(s)
      }

      // 3. Append the result of UTF-8 encoding s to bytes.
      bytes.push(new TextEncoder().encode(s))
    } else if (
      types.isAnyArrayBuffer(element) ||
      types.isTypedArray(element)
    ) {
      // 2. If element is a BufferSource, get a copy of the
      //    bytes held by the buffer source, and append those
      //    bytes to bytes.
      if (!element.buffer) { // ArrayBuffer
        bytes.push(new Uint8Array(element))
      } else {
        bytes.push(element.buffer)
      }
    } else if (isBlobLike(element)) {
      // 3. If element is a Blob, append the bytes it represents
      //    to bytes.
      bytes.push(element)
    }
  }

  // 3. Return bytes.
  return bytes
}

/**
 * @see https://www.w3.org/TR/FileAPI/#convert-line-endings-to-native
 * @param {string} s
 */
function convertLineEndingsNative (s) {
  // 1. Let native line ending be be the code point U+000A LF.
  let nativeLineEnding = '\n'

  // 2. If the underlying platform’s conventions are to
  //    represent newlines as a carriage return and line feed
  //    sequence, set native line ending to the code point
  //    U+000D CR followed by the code point U+000A LF.
  if (process.platform === 'win32') {
    nativeLineEnding = '\r\n'
  }

  return s.replace(/\r?\n/g, nativeLineEnding)
}

module.exports = { File, FileLike }
