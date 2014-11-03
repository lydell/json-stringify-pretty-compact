// Copyright 2014 Simon Lydell
// X11 (“MIT”) Licensed. (See LICENSE.)

var expect = require("chai").expect

var stringify = require("../")

function testStringify(obj, expected, options) {
  var actual = stringify(obj, options)

  if (Array.isArray(expected)) {
    expected = expected.join("\n")
  }

  expect(actual).to.equal(expected)

  if (expected === undefined) return

  // `stringify(obj, {maxLength: 0, indent: indent})` gives the exact same
  // result as `JSON.stringify(obj, null, indent)`.
  expect(stringify(obj, {maxLength: 0, indent: 2}))
    .to.equal(JSON.stringify(obj, null, 2))

  // `stringify(obj, {maxLength: Infinity})` gives the exact same result as
  // `JSON.stringify(obj)`, except that there are spaces after colons and
  // commas.
  expect(stringify(obj, {maxLength: Infinity}).replace(/ /g, ""))
    .to.equal(JSON.stringify(obj).replace(/ /g, ""))
}


suite("stringify", function() {

  test("simple values", function() {
    testStringify(null, "null")
    testStringify(true, "true")
    testStringify(false, "false")
    testStringify([], "[]")
    testStringify({}, "{}")
    testStringify("string", '"string"')
    testStringify(1, "1")
    testStringify(.1, "0.1")
    testStringify(-5.2E+50, "-5.2e+50")
  })


  test("disallowed values", function() {
    testStringify(undefined, undefined)
    testStringify(Function, undefined)
    testStringify({toJSON: Function.prototype}, undefined)
  })


  test("different lengths", function() {
    var obj = {bool: true, array: [1, 2, 3], null: null}

    testStringify(obj, '{"bool": true, "array": [1, 2, 3], "null": null}')

    testStringify(obj, [
       '{',
       '  "bool": true,',
       '  "array": [1, 2, 3],',
       '  "null": null',
       '}'
    ], {maxLength: 30})

    testStringify(obj, [
       '{',
       '  "bool": true,',
       '  "array": [',
       '    1,',
       '    2,',
       '    3',
       '  ],',
       '  "null": null',
       '}'
    ], {maxLength: 15})

    testStringify(obj, JSON.stringify(obj, null, "\t"),
                  {maxLength: 15, indent: "\t"})
  })


  test("sparse array", function() {
    var array = []
    array[3] = true
    array[4] = undefined
    array[5] = {toJSON: Function.prototype},
    array[6] = false

    testStringify(array, "[null, null, null, true, null, null, false]")

    testStringify(array, [
      "[",
      "  null,",
      "  null,",
      "  null,",
      "  true,",
      "  null,",
      "  null,",
      "  false",
      "]"
    ], {maxLength: 15})
  })


  test("“sparse” object", function() {
    var obj = {
      a: undefined,
      b: "long string to make some length",
      c: {toJSON: Function.prototype}
    }

    testStringify(obj, '{"b": "long string to make some length"}')

    testStringify(obj, [
      '{',
      '  "b": "long string to make some length"',
      '}'
    ], {maxLength: 15})
  })


  test("long key name and long value", function() {
    testStringify({
      a: true,
      "long key name": [
        [1, 2, 3, 4, 5]
      ]
    }, [
      '{',
      '  "a": true,',
      '  "long key name": [',
      '    [1, 2, 3, 4, 5]',
      '  ]',
      '}'
    ], {maxLength: 20})
  })


  test("empty containers never multiline", function() {
    testStringify({"array": [], "object": {}}, [
      '{',
      '  "array": [],',
      '  "object": {}',
      '}'
    ], {maxLength: 1})
  })


  test("account for commas in objects", function() {
    var obj = {
      "a": [1, 2, 3],
      "b": [1, 2, 3]
    }

    testStringify(obj, [
      '{',
      '  "a": [1, 2, 3],',
      '  "b": [1, 2, 3]',
      '}'
    ], {maxLength: 17})

    testStringify(obj, [
      '{',
      '  "a": [',
      '    1,',
      '    2,',
      '    3',
      '  ],',
      '  "b": [1, 2, 3]',
      '}'
    ], {maxLength: 16})
  })


  test("account for commas in arrays", function() {
    var obj = [
      [1, 2, 3],
      [1, 2, 3]
    ]

    testStringify(obj, [
      '[',
      '  [1, 2, 3],',
      '  [1, 2, 3]',
      ']'
    ], {maxLength: 12})

    testStringify(obj, [
      '[',
      '  [',
      '    1,',
      '    2,',
      '    3',
      '  ],',
      '  [1, 2, 3]',
      ']'
    ], {maxLength: 11})

  })


  test("Date", function() {
    testStringify(new Date(1337), '"1970-01-01T00:00:01.337Z"')
    testStringify(new Date(1337), '"1970-01-01T00:00:01.337Z"', {maxLength: 0})
  })


  test("boolean with `.toJSON()`", function() {
    var bool = true
    bool.toJSON = function() { return "foo" }

    expect( JSON.stringify(bool) ).to.equal("true")

    testStringify(bool, "true")
  })


  test("tricky strings", function() {
    testStringify({"key:true": ["1,2", 3, '"k":v']},
       '{"key:true": ["1,2", 3, "\\"k\\":v"]}')
  })


  test("circular objects", function() {
    var obj = {}
    obj.obj = obj
    expect( stringify.bind(undefined, obj) ).to.throw(/circular|cyclic/i)
  })


  test("top-level `.toJSON()` only called once", function() {
    var callCount = 0
    var sourceMap = {
      toJSON: function() {
        callCount++
        // This is a really expensive operation.
        return {mappings: "AAAA"}
      }
    }
    expect( stringify(sourceMap, {maxLength: 0}) )
      .to.equal('{\n  "mappings": "AAAA"\n}')
    expect( callCount ).to.equal(1)
  })


  test("wikipedia", function() {
    // Taken from:
    // http://en.wikipedia.org/wiki/JSON
    testStringify({
      "firstName": "John",
      "lastName": "Smith",
      "isAlive": true,
      "age": 25,
      "height_cm": 167.6,
      "address": {
        "streetAddress": "21 2nd Street",
        "city": "New York",
        "state": "NY",
        "postalCode": "10021-3100"
      },
      "phoneNumbers": [
        {
          "type": "home",
          "number": "212 555-1234"
        },
        {
          "type": "office",
          "number": "646 555-4567"
        }
      ],
      "children": [],
      "spouse": null
    }, [
      '{',
      '  "firstName": "John",',
      '  "lastName": "Smith",',
      '  "isAlive": true,',
      '  "age": 25,',
      '  "height_cm": 167.6,',
      '  "address": {',
      '    "streetAddress": "21 2nd Street",',
      '    "city": "New York",',
      '    "state": "NY",',
      '    "postalCode": "10021-3100"',
      '  },',
      '  "phoneNumbers": [',
      '    {"type": "home", "number": "212 555-1234"},',
      '    {"type": "office", "number": "646 555-4567"}',
      '  ],',
      '  "children": [],',
      '  "spouse": null',
      '}'
    ])
  })


  test("creationix", function() {
    // Adapted from:
    // https://github.com/dscape/clarinet/blob/master/samples/creationix.json
    testStringify({
      "image": [
        {"shape": "polygon", "fill": "#248", "stroke": "#48f", "points": [[0.5,47.5],[47.5,47.5],[47.5,0.5]]}
      ],
      "solid": {
        "1": [2,4],
        "2": [1],
        "3": [2],
        "4": [],
        "5": [2,8,1,3,7,9,4,6],
        "6": [],
        "7": [4,8],
        "8": [],
        "9": [6,8]
      },
      "corners": {"1": true,"3": true,"7": false,"9": true}
    }, [
      '{',
      '  "image": [',
      '    {',
      '      "shape": "polygon",',
      '      "fill": "#248",',
      '      "stroke": "#48f",',
      '      "points": [[0.5, 47.5], [47.5, 47.5], [47.5, 0.5]]',
      '    }',
      '  ],',
      '  "solid": {',
      '    "1": [2, 4],',
      '    "2": [1],',
      '    "3": [2],',
      '    "4": [],',
      '    "5": [2, 8, 1, 3, 7, 9, 4, 6],',
      '    "6": [],',
      '    "7": [4, 8],',
      '    "8": [],',
      '    "9": [6, 8]',
      '  },',
      '  "corners": {"1": true, "3": true, "7": false, "9": true}',
      '}'
    ])
  })


  suite("options.indent", function() {

    test("if missing, defaults to 2", function() {
      expect( stringify([1], {maxLength: 0}) ).to.match(/^  /m)
    })


    test("otherwise works like `JSON.stringify`", function() {
      var testIndent = function(indent) {
        var obj = [1]
        expect( stringify(obj, {indent: indent, maxLength: 0}) )
          .to.equal(JSON.stringify(obj, null, indent))
      }

      testIndent(0)
      testIndent(1)
      testIndent(10)
      testIndent(11)
      testIndent(-1)
      testIndent(-Infinity)
      testIndent(+Infinity)
      testIndent("\t")
      testIndent('"a')
      testIndent("123456789012")
      testIndent("            ")
      testIndent("")

      testIndent(undefined)
      testIndent(null)
      testIndent({})
      testIndent(Function)
      testIndent(NaN)
    })

  })


  suite("options.maxLength", function() {

    var lines = function(string) { return string.split("\n") }

    // Returns a value that represented as compact JSON is `length` characters
    // long: `["aaa...a"]`
    var jsonValueOfLength = function(length) {
      return [Array(length - '[""]'.length + 1).join("a")]
    }

    test("if missing, defaults to 80", function() {
      expect( lines(stringify(jsonValueOfLength(80))) )
        .to.have.length(1)
      expect( lines(stringify(jsonValueOfLength(81))) )
        .to.have.length(3)
    })


    test("isn’t considered when no indentation", function() {
      expect( lines(stringify(jsonValueOfLength(81), {indent: 0})) )
        .to.have.length(1)
      expect( lines(stringify(jsonValueOfLength(81), {indent: ""})) )
        .to.have.length(1)
    })


    test("invalid values are treated as 0", function() {
      var testMaxLength = function(length) {
        var obj = [1]
        expect( stringify(obj, {maxLength: length}) )
          .to.equal( stringify(obj, {maxLength: 0}) )
      }

      testMaxLength(-1)
      testMaxLength(-Infinity)

      testMaxLength(undefined)
      testMaxLength(null)
      testMaxLength({})
      testMaxLength(Function)
      testMaxLength(NaN)
    })

  })

})
