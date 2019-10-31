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
    test.each`
      pattern           | url                | matches
      ${true}           | ${"anything"}      | ${false}
      ${false}          | ${"anything"}      | ${false}
      ${null}           | ${"anything"}      | ${false}
      ${undefined}      | ${"anything"}      | ${false}
      ${""}             | ${"anything"}      | ${true}
      ${"*"}            | ${"anything"}      | ${true}
      ${"."}            | ${"anything"}      | ${true}
      ${/thing/}        | ${"anything"}      | ${true}
      ${/z/}            | ${"anything"}      | ${false}
      ${"thing"}        | ${"anything"}      | ${true}
      ${"thi"}          | ${"anything"}      | ${true}
      ${"//thing"}      | ${"any//thing"}    | ${false}
      ${"*thing*"}      | ${"anything"}      | ${true}
      ${"any*"}         | ${"anything"}      | ${true}
      ${"*thing"}       | ${"anything"}      | ${true}
      ${"thing*"}       | ${"anything"}      | ${false}
      ${"*any"}         | ${"anything"}      | ${false}
      ${"an*ng"}        | ${"anything"}      | ${true}
      ${"*ny*in*"}      | ${"anything"}      | ${true}
      ${"(*n?y*i{}n*)"} | ${"(an?ythi{}ng)"} | ${true}
    `('returns $matches when matching "$pattern" against "$url"', ({ pattern, url, matches }) => {
      expect(testAgainstSearch(pattern, url)).toBe(matches);
    });
  });
});
