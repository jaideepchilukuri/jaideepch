import { ___treecensor } from "./treecensor";

const TreeCensor = ___treecensor();

describe("TreeCensor", () => {
  describe(".maskString()", () => {
    let censor;

    beforeEach(() => {
      censor = new TreeCensor(null, {});
    });

    // to make sure tests aren't flakey
    function tryMaskString(input) {
      let result = input;
      for (let i = 0; i < 10 && result === input; i++) {
        result = censor.maskString(input);
      }
      return result;
    }

    describe("with random letters/numbers", () => {
      test("masks to random numbers", () => {
        const masked = censor.maskString("1234");
        expect(masked).toMatch(/\d{4}/);
      });

      test("masks to random lowercase letters", () => {
        const masked = censor.maskString("abcd");
        expect(masked).toMatch(/[a-z]{4}/);
      });

      test("masks to random uppercase letters", () => {
        const masked = censor.maskString("ABCD");
        expect(masked).toMatch(/[A-Z]{4}/);
      });

      test("doesn't mask numbers to the same value", () => {
        expect(tryMaskString("1234567")).not.toEqual("1234567");
      });

      test("doesn't mask lowercase to the same value", () => {
        expect(tryMaskString("abcdefg")).not.toEqual("abcdefg");
      });

      test("doesn't mask uppercase to the same value", () => {
        expect(tryMaskString("ABCDEFG")).not.toEqual("ABCDEFG");
      });
    });

    describe.each(["*.", "m", "°"])("with maskCharacters %s in pii config", maskChars => {
      beforeEach(() => {
        censor.pii.maskCharacters = maskChars;
      });

      test("masks to random numbers", () => {
        const masked = censor.maskString("1234");
        expect(masked).toMatch(new RegExp(`[${maskChars}]{4}`));
      });

      test("masks to random lowercase letters", () => {
        const masked = censor.maskString("abcd");
        expect(masked).toMatch(new RegExp(`[${maskChars}]{4}`));
      });

      test("masks to random uppercase letters", () => {
        const masked = censor.maskString("ABCD");
        expect(masked).toMatch(new RegExp(`[${maskChars}]{4}`));
      });
    });
  });
});
