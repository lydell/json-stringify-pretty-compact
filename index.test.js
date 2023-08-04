import { strict as assert } from "node:assert";
import test from "node:test";
import importedStringify from "./index.js";

// Wrapper around the real `stringify` function that also asserts that it
// behaves like `JSON.stringify`.
function stringify(obj, options) {
  // `stringify(obj, {maxLength: 0, indent: indent})` gives the exact same
  // result as `JSON.stringify(obj, null, indent)`.
  assert.equal(
    importedStringify(obj, { maxLength: 0, indent: 2 }),
    JSON.stringify(obj, null, 2)
  );

  // `stringify(obj, {maxLength: Infinity})` gives the exact same result as
  // `JSON.stringify(obj)`, except that there are spaces after colons and
  // commas.
  assert.equal(
    noSpaces(importedStringify(obj, { maxLength: Infinity })),
    noSpaces(JSON.stringify(obj))
  );

  return importedStringify(obj, options);
}

function noSpaces(obj) {
  return typeof obj === "string" ? obj.replace(/ /g, "") : obj;
}

test("simple values", () => {
  assert.equal(stringify(null), `null`);
  assert.equal(stringify(true), `true`);
  assert.equal(stringify(false), `false`);
  assert.equal(stringify([]), `[]`);
  assert.equal(stringify({}), `{}`);
  assert.equal(stringify("string"), `"string"`);
  assert.equal(stringify(1), `1`);
  assert.equal(stringify(0.1), `0.1`);
  assert.equal(stringify(-5.2e50), `-5.2e+50`);
});

test("disallowed values", () => {
  assert.equal(stringify(undefined), undefined);
  assert.equal(stringify(Function), undefined);
  assert.equal(stringify({ toJSON: Function.prototype }), undefined);
});

test("does not touch string values", () => {
  assert.equal(stringify('{"{s:0}}'), `"{\\"{s:0}}"`);
  assert.equal(stringify(['{"{s:0}}']), `["{\\"{s:0}}"]`);
  assert.equal(stringify({ '{"{s:0}}': 1 }), `{"{\\"{s:0}}": 1}`);
});

test("different lengths", () => {
  const obj = { bool: true, array: [1, 2, 3], null: null };

  assert.equal(
    stringify(obj),
    `{"bool": true, "array": [1, 2, 3], "null": null}`
  );

  assert.equal(
    stringify(obj, { maxLength: 30 }),
    `
{
  "bool": true,
  "array": [1, 2, 3],
  "null": null
}
    `.trim()
  );

  assert.equal(
    stringify(obj, { maxLength: 15 }),
    `
{
  "bool": true,
  "array": [
    1,
    2,
    3
  ],
  "null": null
}
    `.trim()
  );

  assert.equal(
    stringify(obj, { maxLength: 15, indent: "\t" }),
    JSON.stringify(obj, null, "\t")
  );
});

test("sparse array", () => {
  const array = [];
  array[3] = true;
  array[4] = undefined;
  array[5] = { toJSON: Function.prototype };
  array[6] = false;

  assert.equal(stringify(array), `[null, null, null, true, null, null, false]`);

  assert.equal(
    stringify(array, { maxLength: 15 }),
    `
[
  null,
  null,
  null,
  true,
  null,
  null,
  false
]
    `.trim()
  );
});

test("sparse object", () => {
  const obj = {
    a: undefined,
    b: "long string to make some length",
    c: { toJSON: Function.prototype },
  };

  assert.equal(stringify(obj), `{"b": "long string to make some length"}`);

  assert.equal(
    stringify(obj, { maxLength: 15 }),
    `
{
  "b": "long string to make some length"
}
    `.trim()
  );
});

test("long key name and long value", () => {
  assert.equal(
    stringify(
      {
        a: true,
        "long key name": [[1, 2, 3, 4, 5]],
      },
      { maxLength: 20 }
    ),
    `
{
  "a": true,
  "long key name": [
    [1, 2, 3, 4, 5]
  ]
}
    `.trim()
  );
});

test("empty containers never multiline", () => {
  assert.equal(
    stringify({ array: [], object: {} }, { maxLength: 1 }),
    `
{
  "array": [],
  "object": {}
}
    `.trim()
  );
});

test("account for commas in objects", () => {
  const obj = {
    a: [1, 2, 3],
    b: [1, 2, 3],
  };

  assert.equal(
    stringify(obj, { maxLength: 17 }),
    `
{
  "a": [1, 2, 3],
  "b": [1, 2, 3]
}
    `.trim()
  );

  assert.equal(
    stringify(obj, { maxLength: 16 }),
    `
{
  "a": [
    1,
    2,
    3
  ],
  "b": [1, 2, 3]
}
    `.trim()
  );
});

test("account for commas in arrays", () => {
  const obj = [
    [1, 2, 3],
    [1, 2, 3],
  ];

  assert.equal(
    stringify(obj, { maxLength: 12 }),
    `
[
  [1, 2, 3],
  [1, 2, 3]
]
    `.trim()
  );

  assert.equal(
    stringify(obj, { maxLength: 11 }),
    `
[
  [
    1,
    2,
    3
  ],
  [1, 2, 3]
]
    `.trim()
  );
});

test("Date", () => {
  assert.equal(stringify(new Date(1337)), `"1970-01-01T00:00:01.337Z"`);
  assert.equal(
    stringify(new Date(1337), { maxLength: 0 }),
    `"1970-01-01T00:00:01.337Z"`
  );
});

test("boolean with `.toJSON()`", () => {
  const bool = new Boolean(true);

  assert.equal(JSON.stringify(bool), `true`);

  bool.toJSON = () => "foo";

  assert.equal(JSON.stringify(bool), `"foo"`);
  assert.equal(stringify(bool), `"foo"`);
});

test("tricky strings", () => {
  assert.equal(
    stringify({ "key:true": ["1,2", 3, '"k":v'] }),
    `{"key:true": ["1,2", 3, "\\"k\\":v"]}`
  );
});

test("circular objects", () => {
  const obj = {};
  obj.obj = obj;
  assert.throws(() => importedStringify(obj), /circular|cyclic/i);
});

test("top-level `.toJSON()` only called once", () => {
  const tracker = new assert.CallTracker();
  const toJSON = tracker.calls(() => ({ mappings: "AAAA" }), 1);
  const sourceMap = { toJSON };
  assert.equal(
    importedStringify(sourceMap, { maxLength: 0 }),
    `
{
  "mappings": "AAAA"
}
    `.trim()
  );
  tracker.verify();
});

test("wikipedia", () => {
  // Taken from:
  // https://en.wikipedia.org/wiki/JSON
  assert.equal(
    stringify({
      firstName: "John",
      lastName: "Smith",
      isAlive: true,
      age: 25,
      height_cm: 167.6,
      address: {
        streetAddress: "21 2nd Street",
        city: "New York",
        state: "NY",
        postalCode: "10021-3100",
      },
      phoneNumbers: [
        {
          type: "home",
          number: "212 555-1234",
        },
        {
          type: "office",
          number: "646 555-4567",
        },
      ],
      children: [],
      spouse: null,
    }),
    `
{
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
    {"type": "home", "number": "212 555-1234"},
    {"type": "office", "number": "646 555-4567"}
  ],
  "children": [],
  "spouse": null
}
    `.trim()
  );
});

test("creationix", () => {
  // Adapted from:
  // https://github.com/dscape/clarinet/blob/master/samples/creationix.json
  assert.equal(
    stringify({
      image: [
        {
          shape: "polygon",
          fill: "#248",
          stroke: "#48f",
          points: [
            [0.5, 47.5],
            [47.5, 47.5],
            [47.5, 0.5],
          ],
        },
      ],
      solid: {
        1: [2, 4],
        2: [1],
        3: [2],
        4: [],
        5: [2, 8, 1, 3, 7, 9, 4, 6],
        6: [],
        7: [4, 8],
        8: [],
        9: [6, 8],
      },
      corners: { 1: true, 3: true, 7: false, 9: true },
    }),
    `
{
  "image": [
    {
      "shape": "polygon",
      "fill": "#248",
      "stroke": "#48f",
      "points": [[0.5, 47.5], [47.5, 47.5], [47.5, 0.5]]
    }
  ],
  "solid": {
    "1": [2, 4],
    "2": [1],
    "3": [2],
    "4": [],
    "5": [2, 8, 1, 3, 7, 9, 4, 6],
    "6": [],
    "7": [4, 8],
    "8": [],
    "9": [6, 8]
  },
  "corners": {"1": true, "3": true, "7": false, "9": true}
}
    `.trim()
  );
});

test("options.indent: if missing, defaults to 2", () => {
  assert.equal(
    stringify([1], { maxLength: 0 }),
    `
[
  1
]
    `.trim()
  );

  assert.equal(
    stringify([1], { indent: undefined, maxLength: 0 }),
    `
[
  1
]
    `.trim()
  );
});

test("options.indent: otherwise works like `JSON.stringify`", () => {
  function testIndent(indent) {
    const obj = [1];
    assert.equal(
      stringify(obj, { indent, maxLength: 0 }),
      JSON.stringify(obj, null, indent)
    );
  }

  testIndent(0);
  testIndent(1);
  testIndent(10);
  testIndent(11);
  testIndent(-1);
  testIndent(-Infinity);
  testIndent(Number(Infinity));
  testIndent("\t");
  testIndent('"a');
  testIndent("123456789012");
  testIndent("            ");
  testIndent("");
  testIndent(null);
  testIndent({});
  testIndent(Function);
  testIndent(NaN);
});

// Returns a value that represented as compact JSON is `length` characters
// long: `["aaa...a"]`
function jsonValueOfLength(length) {
  return ["a".repeat(length - '[""]'.length)];
}

test("options.maxLength: if missing, defaults to 80", () => {
  assert.equal(
    stringify(jsonValueOfLength(80)),
    `["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"]`
  );
  assert.equal(
    stringify(jsonValueOfLength(80), { maxLength: undefined }),
    `["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"]`
  );
  assert.equal(
    stringify(jsonValueOfLength(81)),
    `
[
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
]
    `.trim()
  );
});

test("options.maxLength: isn't considered when no indentation", () => {
  assert.equal(
    stringify(jsonValueOfLength(81), { indent: 0 }),
    `["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"]`
  );
  assert.equal(
    stringify(jsonValueOfLength(81), { indent: "" }),
    `["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"]`
  );
});

test("options.maxLength: invalid values are treated as 0", () => {
  function testMaxLength(maxLength) {
    const obj = [1];
    assert.equal(
      stringify(obj, { maxLength }),
      stringify(obj, { maxLength: 0 })
    );
  }

  testMaxLength(-1);
  testMaxLength(-Infinity);
  testMaxLength(null);
  testMaxLength({});
  testMaxLength(Function);
  testMaxLength(NaN);
});

test("options.replacer: array of keys", () => {
  const replacer = ["a", "c", 1];
  const obj = { a: { a: [1, 2], b: 3 }, b: 4, 1: 5 };

  assert.equal(
    JSON.stringify(obj, replacer, 2),
    `
{
  "a": {
    "a": [
      1,
      2
    ]
  },
  "1": 5
}
    `.trim()
  );

  assert.equal(stringify(obj, { replacer }), `{"a": {"a": [1, 2]}, "1": 5}`);

  // "1" has moved to the start here compared to standard `JSON.stringify`.
  // Oh well.
  assert.equal(
    stringify(obj, { maxLength: 1, replacer }),
    `
{
  "1": 5,
  "a": {
    "a": [
      1,
      2
    ]
  }
}
    `.trim()
  );
});

test("options.replacer: function", () => {
  const replacerImplementation = (key, value) =>
    value === 2 || typeof value !== "number" ? value : undefined;
  const obj = { a: 1, b: [2, 3] };
  const tracker1 = new assert.CallTracker();
  const replacer1 = tracker1.calls(replacerImplementation, 5);
  assert.equal(stringify(obj, { replacer: replacer1 }), `{"b": [2, null]}`);
  tracker1.verify();

  const tracker2 = new assert.CallTracker();
  const replacer2 = tracker2.calls(replacerImplementation, 5);
  assert.equal(
    stringify(obj, { replacer: replacer2, maxLength: 1 }),
    `
{
  "b": [
    2,
    null
  ]
}
    `.trim()
  );
  tracker2.verify();
});

test("options.replacer: null", () => {
  assert.equal(
    stringify({ a: 1, b: [2, 3] }, { replacer: null }),
    `{"a": 1, "b": [2, 3]}`
  );
});
