import { dynamicConfigReplacer } from "./dynconfigs";

describe("Dynamic configurations", () => {
  describe("happy path", () => {
    let result;

    beforeEach(() => {
      window.testVar = 42;
      window.objVar = {
        deep: {
          nested: {
            value: "testatestaboo",
          },
        },
        intAsString: "99",
        boolAsString: "false",
        anotherBoolAsString: "true",
        nullValue: null,
        stringWithHTML: "<value>",
      };

      result = dynamicConfigReplacer({
        deep: {
          nested: {
            replacement: {
              source: "variable",
              path: "objVar.deep.nested.value",
              default: "",
            },
          },
        },
        int: {
          source: "variable",
          path: "objVar.intAsString",
          default: 0,
        },
        stringyInt: {
          source: "variable",
          path: "testVar",
          default: "s",
        },
        falseBool: {
          source: "variable",
          path: "objVar.boolAsString",
          default: true,
        },
        trueBool: {
          source: "variable",
          path: "objVar.anotherBoolAsString",
          default: false,
        },
        test: {
          source: "variable",
          path: "testVar",
          default: 0,
        },
        defaulted: {
          source: "variable",
          path: "nonexistant.value.somewhere",
          default: "defaulted value",
        },
        defaultedNull: {
          source: "variable",
          path: "objVar.nullValue",
          default: 52,
        },
        html: {
          source: "variable",
          path: "objVar.stringWithHTML",
          default: "ss",
        },
      });
    });

    test("replaces a simple config var", () => {
      expect(result.test).toEqual(42);
    });

    test("uses the default if the value doesn't exist", () => {
      expect(result.defaulted).toEqual("defaulted value");
    });

    test("uses the default if the value is null", () => {
      expect(result.defaultedNull).toEqual(52);
    });

    test("handles deeply nested configs", () => {
      expect(result.deep.nested.replacement).toEqual("testatestaboo");
    });

    test("coerces a string to an number", () => {
      expect(result.int).toBe(99);
    });

    test("coerces a number to a string", () => {
      expect(result.stringyInt).toBe("42");
    });

    test('coerces a string "false" to false', () => {
      expect(result.falseBool).toBe(false);
    });

    test('coerces a string "true" to true', () => {
      expect(result.trueBool).toBe(true);
    });

    test("sanitizes any html", () => {
      expect(result.html).toBe("&lt;value&gt;");
    });
  });

  describe("errors", () => {
    test("throws if variable contains a function", () => {
      window.testVar = function() {};
      expect(() =>
        dynamicConfigReplacer({ test: { source: "variable", path: "testVar", default: 0 } })
      ).toThrow("Cannot replace config setting test with path testVar with a function");
    });

    test("throws if variable contains an object", () => {
      window.testVar = {};
      expect(() =>
        dynamicConfigReplacer({ test: { source: "variable", path: "testVar", default: 0 } })
      ).toThrow("Cannot replace config setting test with path testVar with a object");
    });

    test("throws if default is a bad type", () => {
      window.testVar = 0;
      expect(() =>
        dynamicConfigReplacer({ test: { source: "variable", path: "testVar", default: {} } })
      ).toThrow("Default for test replaced with path testVar is invalid type object");
    });
  });
});
