const importedStringify = require(".");

// Make snapshots easier to read.
// Before: `"\\"string\\""`
// After: `"string"`
expect.addSnapshotSerializer({
  test: value => typeof value === "string",
  print: value => value,
});

// Wrapper around the real `stringify` function that also asserts that it
// behaves like `JSON.stringify`.
function stringify(obj, options) {
  // `stringify(obj, {maxLength: 0, indent: indent})` gives the exact same
  // result as `JSON.stringify(obj, null, indent)`.
  expect(importedStringify(obj, { maxLength: 0, indent: 2 })).toBe(
    JSON.stringify(obj, null, 2)
  );

  // `stringify(obj, {maxLength: Infinity})` gives the exact same result as
  // `JSON.stringify(obj)`, except that there are spaces after colons and
  // commas.
  expect(noSpaces(importedStringify(obj, { maxLength: Infinity }))).toBe(
    noSpaces(JSON.stringify(obj))
  );

  return importedStringify(obj, options);
}

function noSpaces(obj) {
  return typeof obj === "string" ? obj.replace(/ /g, "") : obj;
}

describe("stringify", () => {
  test("simple values", () => {
    expect(stringify(null)).toMatchInlineSnapshot(`null`);
    expect(stringify(true)).toMatchInlineSnapshot(`true`);
    expect(stringify(false)).toMatchInlineSnapshot(`false`);
    expect(stringify([])).toMatchInlineSnapshot(`[]`);
    expect(stringify({})).toMatchInlineSnapshot(`{}`);
    expect(stringify("string")).toMatchInlineSnapshot(`"string"`);
    expect(stringify(1)).toMatchInlineSnapshot(`1`);
    expect(stringify(0.1)).toMatchInlineSnapshot(`0.1`);
    expect(stringify(-5.2e50)).toMatchInlineSnapshot(`-5.2e+50`);
  });

  test("disallowed values", () => {
    expect(stringify(undefined)).toBeUndefined();
    expect(stringify(Function)).toBeUndefined();
    expect(stringify({ toJSON: Function.prototype })).toBeUndefined();
  });

  test("does not touch string values", () => {
    expect(stringify('{"{s:0}}')).toMatchInlineSnapshot(`"{\\"{s:0}}"`);
    expect(stringify(['{"{s:0}}'])).toMatchInlineSnapshot(`["{\\"{s:0}}"]`);
    expect(stringify({ '{"{s:0}}': 1 })).toMatchInlineSnapshot(
      `{"{\\"{s:0}}": 1}`
    );
  });

  test("different lengths", () => {
    const obj = { bool: true, array: [1, 2, 3], null: null };

    expect(stringify(obj)).toMatchInlineSnapshot(
      `{"bool": true, "array": [1, 2, 3], "null": null}`
    );

    expect(stringify(obj, { maxLength: 30 })).toMatchInlineSnapshot(`
{
  "bool": true,
  "array": [1, 2, 3],
  "null": null
}
`);

    expect(stringify(obj, { maxLength: 15 })).toMatchInlineSnapshot(`
{
  "bool": true,
  "array": [
    1,
    2,
    3
  ],
  "null": null
}
`);

    expect(stringify(obj, { maxLength: 15, indent: "\t" })).toBe(
      JSON.stringify(obj, null, "\t")
    );
  });

  test("sparse array", () => {
    const array = [];
    array[3] = true;
    array[4] = undefined;
    array[5] = { toJSON: Function.prototype };
    array[6] = false;

    expect(stringify(array)).toMatchInlineSnapshot(
      `[null, null, null, true, null, null, false]`
    );

    expect(stringify(array, { maxLength: 15 })).toMatchInlineSnapshot(`
[
  null,
  null,
  null,
  true,
  null,
  null,
  false
]
`);
  });

  test("“sparse” object", () => {
    const obj = {
      a: undefined,
      b: "long string to make some length",
      c: { toJSON: Function.prototype },
    };

    expect(stringify(obj)).toMatchInlineSnapshot(
      `{"b": "long string to make some length"}`
    );

    expect(stringify(obj, { maxLength: 15 })).toMatchInlineSnapshot(`
{
  "b": "long string to make some length"
}
`);
  });

  test("long key name and long value", () => {
    expect(
      stringify(
        {
          a: true,
          "long key name": [[1, 2, 3, 4, 5]],
        },
        { maxLength: 20 }
      )
    ).toMatchInlineSnapshot(`
{
  "a": true,
  "long key name": [
    [1, 2, 3, 4, 5]
  ]
}
`);
  });

  test("empty containers never multiline", () => {
    expect(stringify({ array: [], object: {} }, { maxLength: 1 }))
      .toMatchInlineSnapshot(`
{
  "array": [],
  "object": {}
}
`);
  });

  test("account for commas in objects", () => {
    const obj = {
      a: [1, 2, 3],
      b: [1, 2, 3],
    };

    expect(stringify(obj, { maxLength: 17 })).toMatchInlineSnapshot(`
{
  "a": [1, 2, 3],
  "b": [1, 2, 3]
}
`);

    expect(stringify(obj, { maxLength: 16 })).toMatchInlineSnapshot(`
{
  "a": [
    1,
    2,
    3
  ],
  "b": [1, 2, 3]
}
`);
  });

  test("account for commas in arrays", () => {
    const obj = [[1, 2, 3], [1, 2, 3]];

    expect(stringify(obj, { maxLength: 12 })).toMatchInlineSnapshot(`
[
  [1, 2, 3],
  [1, 2, 3]
]
`);

    expect(stringify(obj, { maxLength: 11 })).toMatchInlineSnapshot(`
[
  [
    1,
    2,
    3
  ],
  [1, 2, 3]
]
`);
  });

  test("Date", () => {
    expect(stringify(new Date(1337))).toMatchInlineSnapshot(
      `"1970-01-01T00:00:01.337Z"`
    );
    expect(stringify(new Date(1337), { maxLength: 0 })).toMatchInlineSnapshot(
      `"1970-01-01T00:00:01.337Z"`
    );
  });

  test("boolean with `.toJSON()`", () => {
    // eslint-disable-next-line no-new-wrappers
    const bool = new Boolean(true);

    expect(JSON.stringify(bool)).toMatchInlineSnapshot(`true`);

    bool.toJSON = () => "foo";

    expect(JSON.stringify(bool)).toMatchInlineSnapshot(`"foo"`);
    expect(stringify(bool)).toMatchInlineSnapshot(`"foo"`);
  });

  test("tricky strings", () => {
    expect(
      stringify({ "key:true": ["1,2", 3, '"k":v'] })
    ).toMatchInlineSnapshot(`{"key:true": ["1,2", 3, "\\"k\\":v"]}`);
  });

  test("circular objects", () => {
    const obj = {};
    obj.obj = obj;
    expect(() => importedStringify(obj)).toThrow(/circular|cyclic/i);
  });

  test("top-level `.toJSON()` only called once", () => {
    const toJSON = jest.fn().mockImplementation(() => ({ mappings: "AAAA" }));
    const sourceMap = { toJSON };
    expect(importedStringify(sourceMap, { maxLength: 0 }))
      .toMatchInlineSnapshot(`
{
  "mappings": "AAAA"
}
`);
    expect(toJSON).toHaveBeenCalledTimes(1);
  });

  test("wikipedia", () => {
    // Taken from:
    // https://en.wikipedia.org/wiki/JSON
    expect(
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
      })
    ).toMatchInlineSnapshot(`
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
`);
  });

  test("creationix", () => {
    // Adapted from:
    // https://github.com/dscape/clarinet/blob/master/samples/creationix.json
    expect(
      stringify({
        image: [
          {
            shape: "polygon",
            fill: "#248",
            stroke: "#48f",
            points: [[0.5, 47.5], [47.5, 47.5], [47.5, 0.5]],
          },
        ],
        solid: {
          "1": [2, 4],
          "2": [1],
          "3": [2],
          "4": [],
          "5": [2, 8, 1, 3, 7, 9, 4, 6],
          "6": [],
          "7": [4, 8],
          "8": [],
          "9": [6, 8],
        },
        corners: { "1": true, "3": true, "7": false, "9": true },
      })
    ).toMatchInlineSnapshot(`
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
`);
  });

  describe("options.indent", () => {
    test("if missing, defaults to 2", () => {
      expect(stringify([1], { maxLength: 0 })).toMatchInlineSnapshot(`
[
  1
]
`);
      expect(stringify([1], { indent: undefined, maxLength: 0 }))
        .toMatchInlineSnapshot(`
[
  1
]
`);
    });

    test("otherwise works like `JSON.stringify`", () => {
      function testIndent(indent) {
        const obj = [1];
        expect(stringify(obj, { indent, maxLength: 0 })).toBe(
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
  });

  describe("options.maxLength", () => {
    // Returns a value that represented as compact JSON is `length` characters
    // long: `["aaa...a"]`
    function jsonValueOfLength(length) {
      return ["a".repeat(length - '[""]'.length)];
    }

    test("if missing, defaults to 80", () => {
      expect(stringify(jsonValueOfLength(80))).toMatchInlineSnapshot(
        `["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"]`
      );
      expect(
        stringify(jsonValueOfLength(80), { maxLength: undefined })
      ).toMatchInlineSnapshot(
        `["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"]`
      );
      expect(stringify(jsonValueOfLength(81))).toMatchInlineSnapshot(`
[
  "aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"
]
`);
    });

    test("isn’t considered when no indentation", () => {
      expect(
        stringify(jsonValueOfLength(81), { indent: 0 })
      ).toMatchInlineSnapshot(
        `["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"]`
      );
      expect(
        stringify(jsonValueOfLength(81), { indent: "" })
      ).toMatchInlineSnapshot(
        `["aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa"]`
      );
    });

    test("invalid values are treated as 0", () => {
      function testMaxLength(maxLength) {
        const obj = [1];
        expect(stringify(obj, { maxLength })).toBe(
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
  });
});
