import { getRootDomain, testAgainstSearch } from "../utils";

describe("misc/urls", () => {
  describe("getRootDomain", () => {
    test.each([
      ["https://www.thing.blah.macys.com/ohai", "macys.com"],
      ["http://www.three.co.uk/", "three.co.uk"],
      ["https://www.thing.blah.mil.us/ohai", "blah.mil.us"],
      ["https://www.thing.blah.qc.ca/ohai", "blah.qc.ca"],
      ["https://www.thing.forest.fed.us/ohai", "forest.fed.us"],
    ])("given %s returns %s", (url, domain) => {
      expect(getRootDomain(url)).toEqual(domain);
    });
  });

  describe("testAgainstSearch", () => {
    const runtests = ({ pattern, url, matches }) => {
      expect(testAgainstSearch(pattern, url)).toBe(matches);
    };

    describe("with old default syntax", () => {
      // test the old legacy algorithm with the same testcases to ensure they are identical
      // this is the default implementation without a prefix
      describe.each([["legacy", legacyTestAgainstSearch], ["modern", testAgainstSearch]])(
        "%s",
        (_, matchFunction) => {
          const testboth = ({ pattern, url, matches }) => {
            expect(matchFunction(pattern, url)).toBe(matches);
          };

          describe("with special cases", () => {
            test.each`
              pattern  | url           | matches
              ${true}  | ${"anything"} | ${false}
              ${false} | ${"anything"} | ${false}
              ${null}  | ${"anything"} | ${false}
              ${""}    | ${"anything"} | ${false}
              ${"*"}   | ${"anything"} | ${true}
              ${"."}   | ${"anything"} | ${true}
            `('returns $matches when matching "$pattern" against "$url"', testboth);
          });

          describe("with no stars and some double slashes", () => {
            test.each`
              pattern      | url               | matches
              ${"//test"}  | ${"//test"}       | ${true}
              ${"//test"}  | ${"//test/"}      | ${true}
              ${"//test/"} | ${"//test"}       | ${true}
              ${"//test/"} | ${"//test/"}      | ${true}
              ${"//test/"} | ${"//test/test"}  | ${false}
              ${"//test/"} | ${"//test/?test"} | ${false}
              ${"//test/"} | ${"//test?test"}  | ${false}
              ${"//test"}  | ${"b4//test"}     | ${false}
              ${"//test"}  | ${"b4//test/"}    | ${false}
              ${"//test/"} | ${"b4//test"}     | ${false}
              ${"//test/"} | ${"b4//test/"}    | ${false}
            `('returns $matches when matching "$pattern" against "$url"', testboth);
          });

          describe("no stars and no double slashes", () => {
            test.each`
              pattern   | url            | matches
              ${"test"} | ${"test"}      | ${true}
              ${"test"} | ${"anytest"}   | ${true}
              ${"test"} | ${"tester"}    | ${true}
              ${"test"} | ${"anytester"} | ${true}
              ${"test"} | ${"nothing"}   | ${false}
            `('returns $matches when matching "$pattern" against "$url"', testboth);
          });

          describe("with a star in it", () => {
            test.each`
              pattern      | url           | matches
              ${"*thing*"} | ${"anything"} | ${true}
              ${"*thing*"} | ${"stuff"}    | ${false}
              ${"any*"}    | ${"anything"} | ${true}
              ${"*thing"}  | ${"anything"} | ${true}
              ${"thing*"}  | ${"anything"} | ${false}
              ${"*any"}    | ${"anything"} | ${false}
              ${"an*ng"}   | ${"anything"} | ${true}
              ${"*ny*in*"} | ${"anything"} | ${true}
            `('returns $matches when matching "$pattern" against "$url"', testboth);
          });

          // this behaviour is probably buggy but we need to duplicate it
          describe("url may optionally end in a slash", () => {
            test.each`
              pattern          | url             | matches
              ${"*thing"}      | ${"anything/"}  | ${true}
              ${"*thing"}      | ${"anything"}   | ${true}
              ${"*thing/"}     | ${"anything"}   | ${false}
              ${"//anything/"} | ${"//anything"} | ${true}
              ${"*thing/"}     | ${"anything/"}  | ${true}
            `('returns $matches when matching "$pattern" against "$url"', testboth);
          });
        }
      );
    });

    describe("with new glob syntax", () => {
      describe("with a star in it", () => {
        test.each`
          pattern           | url           | matches
          ${"glob:*thing*"} | ${"anything"} | ${true}
          ${"glob:any*"}    | ${"anything"} | ${true}
          ${"glob:*thing"}  | ${"anything"} | ${true}
          ${"glob:thing*"}  | ${"anything"} | ${false}
          ${"glob:*any"}    | ${"anything"} | ${false}
          ${"glob:an*ng"}   | ${"anything"} | ${true}
          ${"glob:*ny*in*"} | ${"anything"} | ${true}
        `('returns $matches when matching "$pattern" against "$url"', runtests);
      });

      describe("with a star and slashes", () => {
        test.each`
          pattern        | url              | matches
          ${"glob:/*"}   | ${"/anything"}   | ${true}
          ${"glob:/*"}   | ${"/any/thing"}  | ${false}
          ${"glob:/*/*"} | ${"/any/thing"}  | ${true}
          ${"glob:/*/*"} | ${"/any/th/ing"} | ${false}
        `('returns $matches when matching "$pattern" against "$url"', runtests);
      });

      describe("with double stars", () => {
        test.each`
          pattern            | url                   | matches
          ${"glob:/**"}      | ${"/an/y/thing"}      | ${true}
          ${"glob:/**"}      | ${"blah/an/y/thing"}  | ${false}
          ${"glob:**/thing"} | ${"/an/y/thing"}      | ${true}
          ${"glob:**/thing"} | ${"/an/y/thing/more"} | ${false}
        `('returns $matches when matching "$pattern" against "$url"', runtests);
      });

      describe("with double slashes", () => {
        test.each`
          pattern           | url          | matches
          ${"glob:thing/"}  | ${"thing"}   | ${false}
          ${"glob:thing/"}  | ${"thing/"}  | ${true}
          ${"glob:thing/"}  | ${"thing//"} | ${true}
          ${"glob:thing//"} | ${"thing"}   | ${true}
          ${"glob:thing//"} | ${"thing/"}  | ${true}
          ${"glob:thing//"} | ${"thing//"} | ${true}
        `('returns $matches when matching "$pattern" against "$url"', runtests);
      });

      describe("when matching with query string", () => {
        test.each`
          pattern               | url                          | matches
          ${"glob:blah"}        | ${"blah?anything"}           | ${true}
          ${"glob:**?anything"} | ${"blah?anything"}           | ${true}
          ${"glob:**?anything"} | ${"blah/blah/blah?anything"} | ${true}
          ${"glob:blah?**"}     | ${"blah?any/th/ing"}         | ${true}
          ${"glob:?anything"}   | ${"blah?anything"}           | ${false}
          ${"glob:*?anything"}  | ${"blah/blah/blah?anything"} | ${false}
          ${"glob:blah?*"}      | ${"blah?any/th/ing"}         | ${false}
        `('returns $matches when matching "$pattern" against "$url"', runtests);
      });

      describe("when passed regex special characters", () => {
        test.each`
          pattern                | url                | matches
          ${"glob:(*n?y*i{}n*)"} | ${"(an?ythi{}ng)"} | ${true}
        `('returns $matches when matching "$pattern" against "$url"', runtests);
      });
    });

    describe("when passed regex", () => {
      test.each`
        pattern        | url           | matches
        ${/thing/}     | ${"anything"} | ${true}
        ${/z/}         | ${"anything"} | ${false}
        ${"re:thing"}  | ${"anything"} | ${true}
        ${"re:z"}      | ${"anything"} | ${false}
        ${"re:^a.*g$"} | ${"anything"} | ${true}
      `('returns $matches when matching "$pattern" against "$url"', runtests);
    });
  });
});

/** Legacy testAgainstSearch implementation */
function legacyTestAgainstSearch(srch, url) {
  // Check for these backwards compatibility cases
  if (srch === null || typeof srch === "boolean" || typeof url === "boolean") {
    return false;
  } else if (srch === ".") {
    return true;
  } else if (srch instanceof RegExp) {
    return srch.test(url);
  } else if (srch.indexOf("*") == -1 && srch.indexOf("//") == -1 && srch.trim() !== "") {
    return url.indexOf(srch) > -1;
  }
  // If none of these checks passed, proceed with the rest of the wildcard matching

  let ispassing, x;
  // Get rid of trailing whitespace, multiple stars, and convert to lower case
  // Then convert to an array of pieces
  srch = srch
    .replace(/^\s+|\s+$/g, "")
    .replace(/[*]{2,}/g, "*")
    .toLowerCase();
  url = url.toLowerCase();

  if (srch == "*") {
    return true;
  }
  const tmpbits = [];
  while (srch.indexOf("*") > -1) {
    if (srch.indexOf("*") > 0) {
      tmpbits.push(srch.substr(0, srch.indexOf("*")));
    }
    tmpbits.push("*");
    srch = srch.substr(srch.indexOf("*") + 1);
  }
  if (srch.length > 0) {
    tmpbits.push(srch);
  }
  ispassing = tmpbits.length !== 0;
  for (x = 0; x < tmpbits.length; x++) {
    srch = tmpbits[x];
    if (srch == "*") {
      if (tmpbits.length > x + 1) {
        x++;
        if (url.indexOf(tmpbits[x]) == -1) {
          ispassing = false;
          break;
        } else {
          url = url.substr(url.indexOf(tmpbits[x]) + tmpbits[x].length);
        }
      }

      if (
        x == tmpbits.length - 1 &&
        tmpbits[x] !== "*" &&
        (url != tmpbits[x] && url != `${tmpbits[x]}/` && tmpbits[x] != `${url}/`) &&
        url.length > 0 &&
        url != "/"
      ) {
        // x already points to the next fragment (in this case the last one)
        // The array has exhausted.
        ispassing = false;
        break;
      }
    } else if (url.substr(0, srch.length) != srch && url != `${srch}/` && srch != `${url}/`) {
      ispassing = false;
      break;
    } else {
      url = url.substr(srch.length);
      if (x == tmpbits.length - 1 && url.length > 0 && url != "/") {
        // The array has exhausted.
        ispassing = false;
        break;
      }
    }
  }

  // Did we match?
  return !!ispassing;
}
