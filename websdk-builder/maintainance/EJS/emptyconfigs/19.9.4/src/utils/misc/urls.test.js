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

    describe("with special cases", () => {
      test.each`
        pattern      | url           | matches
        ${true}      | ${"anything"} | ${false}
        ${false}     | ${"anything"} | ${false}
        ${null}      | ${"anything"} | ${false}
        ${undefined} | ${"anything"} | ${false}
        ${""}        | ${"anything"} | ${true}
        ${"*"}       | ${"anything"} | ${true}
        ${"."}       | ${"anything"} | ${true}
      `('returns $matches when matching "$pattern" against "$url"', runtests);
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

    describe("with a star in it", () => {
      test.each`
        pattern      | url           | matches
        ${"*thing*"} | ${"anything"} | ${true}
        ${"any*"}    | ${"anything"} | ${true}
        ${"*thing"}  | ${"anything"} | ${true}
        ${"thing*"}  | ${"anything"} | ${false}
        ${"*any"}    | ${"anything"} | ${false}
        ${"an*ng"}   | ${"anything"} | ${true}
        ${"*ny*in*"} | ${"anything"} | ${true}
      `('returns $matches when matching "$pattern" against "$url"', runtests);
    });

    describe("with a star and slashes", () => {
      test.each`
        pattern   | url              | matches
        ${"/*"}   | ${"/anything"}   | ${true}
        ${"/*"}   | ${"/any/thing"}  | ${false}
        ${"/*/*"} | ${"/any/thing"}  | ${true}
        ${"/*/*"} | ${"/any/th/ing"} | ${false}
      `('returns $matches when matching "$pattern" against "$url"', runtests);
    });

    describe("with double stars", () => {
      test.each`
        pattern       | url              | matches
        ${"/**"}      | ${"/an/y/thing"} | ${true}
        ${"**/thing"} | ${"/an/y/thing"} | ${true}
      `('returns $matches when matching "$pattern" against "$url"', runtests);
    });

    describe("with double slashes", () => {
      test.each`
        pattern      | url          | matches
        ${"thing/"}  | ${"thing"}   | ${false}
        ${"thing/"}  | ${"thing/"}  | ${true}
        ${"thing/"}  | ${"thing//"} | ${true}
        ${"thing//"} | ${"thing"}   | ${true}
        ${"thing//"} | ${"thing/"}  | ${true}
        ${"thing//"} | ${"thing//"} | ${true}
      `('returns $matches when matching "$pattern" against "$url"', runtests);
    });

    describe("when passed regex special characters", () => {
      test.each`
        pattern           | url                | matches
        ${"(*n?y*i{}n*)"} | ${"(an?ythi{}ng)"} | ${true}
      `('returns $matches when matching "$pattern" against "$url"', runtests);
    });

    describe("when matching with query string", () => {
      test.each`
        pattern          | url                          | matches
        ${"blah"}        | ${"blah?anything"}           | ${true}
        ${"**?anything"} | ${"blah?anything"}           | ${true}
        ${"**?anything"} | ${"blah/blah/blah?anything"} | ${true}
        ${"blah?**"}     | ${"blah?any/th/ing"}         | ${true}
        ${"?anything"}   | ${"blah?anything"}           | ${false}
        ${"*?anything"}  | ${"blah/blah/blah?anything"} | ${false}
        ${"blah?*"}      | ${"blah?any/th/ing"}         | ${false}
      `('returns $matches when matching "$pattern" against "$url"', runtests);
    });
  });
});
