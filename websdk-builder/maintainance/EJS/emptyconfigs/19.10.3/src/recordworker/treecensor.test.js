import { TreeCensor } from "./treecensor";
import { DomTree } from "../record/capture/domtree";

describe("TreeCensor", () => {
  describe(".maskString()", () => {
    let censor;
    const numberOfTries = 10;

    beforeEach(() => {
      censor = new TreeCensor(null, {});
    });

    // to make sure tests aren't flakey
    function tryMaskString(input) {
      let result = input;
      for (let i = 0; i < numberOfTries && result === input; i++) {
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

  describe("masking", () => {
    const rootId = 0;
    const headId = 1;
    const styleContentId = 3;
    const titleTagId = 4;
    const titleContentId = 5;
    const lowercaseStyleContentId = 7;
    const bodyContentId = 9;
    const selectTagId = 10;
    const optionTagId = 11;
    const optionContentId = 12;

    const styleContent = "This should not get masked";
    const lowercaseStyleContent = "This is the lowercased style tag contents";
    const titleContent = "This is the title tag contents";
    const bodyContent = "This is a string in the body";
    const selectPlaceholder = "Placeholder for select";
    const optionValue = "testvalue";
    const optionContent = "Option value displayed";
    const optionLabel = "testlabel";

    const aMaskedString = "Masked masked masked masked";

    const demoTree = fixTreeParents({
      id: rootId,
      n: "HTML",
      c: [
        {
          id: headId,
          n: "HEAD",
          c: [
            {
              id: 2,
              n: "STYLE",
              c: [{ id: styleContentId, v: styleContent }],
            },
            {
              id: titleTagId,
              n: "TITLE",
              c: [{ id: titleContentId, v: titleContent }],
            },
            {
              id: 6,
              n: "style",
              c: [{ id: lowercaseStyleContentId, v: lowercaseStyleContent }],
            },
          ],
        },
        {
          id: 8,
          n: "BODY",
          c: [
            { id: bodyContentId, v: bodyContent },
            {
              id: selectTagId,
              n: "SELECT",
              a: { placeholder: selectPlaceholder },
              c: [
                {
                  id: optionTagId,
                  n: "OPTION",
                  a: { value: optionValue, label: optionLabel },
                  c: [{ id: optionContentId, v: optionContent }],
                },
              ],
            },
          ],
        },
      ],
    });

    let tree;

    beforeEach(() => {
      tree = new DomTree();
      tree.import(JSON.parse(JSON.stringify(demoTree)));
    });

    describe("when in mask everything (whitelisting) mode", () => {
      const useWhiteListing = true;

      describe("when in noRules mode", () => {
        const noRules = true;
        let censor;

        beforeEach(() => {
          censor = new TreeCensor(tree, { useWhiteListing, noRules });
          censor.maskString = () => aMaskedString;
          censor.censor(tree.getById(rootId));
        });

        test("masks the title element contents", () => {
          const content = tree.getById(titleContentId).v;

          expect(content).toEqual(aMaskedString);
        });

        test("doesn't mask style tag content", () => {
          const content = tree.getById(styleContentId).v;
          const nonMaskedContent = styleContent;

          expect(content).toEqual(nonMaskedContent);
        });

        test("doesn't mask lowercase style tag content either", () => {
          const content = tree.getById(lowercaseStyleContentId).v;
          const nonMaskedContent = lowercaseStyleContent;

          expect(content).toEqual(nonMaskedContent);
        });

        test("masks a text node in the body", () => {
          const content = tree.getById(bodyContentId).v;

          expect(content).toEqual(aMaskedString);
        });

        test("masks the option value of a select tag", () => {
          const value = tree.getById(optionTagId).a.value;

          expect(value).toEqual(aMaskedString);
        });

        test("masks the placeholder of a select tag", () => {
          const placeholder = tree.getById(selectTagId).a.placeholder;

          expect(placeholder).toEqual(aMaskedString);
        });

        test("masks the option label of a select tag", () => {
          const label = tree.getById(optionTagId).a.label;

          expect(label).toEqual(aMaskedString);
        });

        test("masks the select tag option contents", () => {
          const content = tree.getById(optionContentId).v;

          expect(content).toEqual(aMaskedString);
        });
      });

      describe("when some elements are specified (not noRules mode)", () => {
        const noRules = false;
        let censor;

        beforeEach(() => {
          censor = new TreeCensor(tree, { useWhiteListing, noRules });
          censor.maskString = () => aMaskedString;

          // specify specific elements to unmaks
          censor.updateMaskingTargets({
            unmasked: [titleTagId],
            masked: [],
            whitelist: [selectTagId],
            redact: [],
          });

          censor.censor(tree.getById(rootId));
        });

        test("masks the text node in the body", () => {
          const content = tree.getById(bodyContentId).v;

          expect(content).toEqual(aMaskedString);
        });

        describe("because it's in the unmasking targets", () => {
          test("unmasks the title tag contents", () => {
            const content = tree.getById(titleContentId).v;
            const nonMaskedContent = titleContent;

            expect(content).toEqual(nonMaskedContent);
          });

          test("unmasks the placeholder of a select tag", () => {
            const placeholder = tree.getById(selectTagId).a.placeholder;
            const nonMaskedContent = selectPlaceholder;

            expect(placeholder).toEqual(nonMaskedContent);
          });

          test("unmasks the option label of a select tag", () => {
            const label = tree.getById(optionTagId).a.label;
            const nonMaskedContent = optionLabel;

            expect(label).toEqual(nonMaskedContent);
          });

          test("unmasks option value of a select tag", () => {
            const value = tree.getById(optionTagId).a.value;
            const nonMaskedContent = optionValue;

            expect(value).toEqual(nonMaskedContent);
          });

          test("unmasks the select tag option contents", () => {
            const content = tree.getById(optionContentId).v;
            const nonMaskedContent = optionContent;

            expect(content).toEqual(nonMaskedContent);
          });
        });
      });
    });

    describe("when in unmask everything (blacklisting) mode", () => {
      const useWhiteListing = false;

      describe("when in noRules mode", () => {
        const noRules = true;
        let censor;

        beforeEach(() => {
          censor = new TreeCensor(tree, { useWhiteListing, noRules });
          censor.maskString = () => aMaskedString;
          censor.censor(tree.getById(rootId));
        });

        test("doesn't mask the text node in the body", () => {
          const content = tree.getById(bodyContentId).v;
          const nonMaskedContent = bodyContent;

          expect(content).toEqual(nonMaskedContent);
        });

        test("still masks the placeholder of a select tag", () => {
          const placeholder = tree.getById(selectTagId).a.placeholder;

          expect(placeholder).toEqual(aMaskedString);
        });

        test("still masks the option label of a select tag", () => {
          const label = tree.getById(optionTagId).a.label;

          expect(label).toEqual(aMaskedString);
        });

        test("still masks the option value of a select tag", () => {
          const value = tree.getById(optionTagId).a.value;

          expect(value).toEqual(aMaskedString);
        });

        test("still masks the select tag option contents", () => {
          const content = tree.getById(optionContentId).v;

          expect(content).toEqual(aMaskedString);
        });
      });

      describe("when elements specified (not noRules)", () => {
        const noRules = false;
        let censor;

        beforeEach(() => {
          censor = new TreeCensor(tree, { useWhiteListing, noRules });
          censor.maskString = () => aMaskedString;

          // specify specific elements to unmaks
          censor.updateMaskingTargets({
            unmasked: [],
            masked: [headId],
            whitelist: [],
            redact: [],
          });

          censor.censor(tree.getById(rootId));
        });

        test("doesn't mask the text node in the body", () => {
          const content = tree.getById(bodyContentId).v;
          const nonMaskedContent = bodyContent;

          expect(content).toEqual(nonMaskedContent);
        });

        test("still masks the option value of a select tag", () => {
          const value = tree.getById(optionTagId).a.value;

          expect(value).toEqual(aMaskedString);
        });

        test("still masks the select tag option contents", () => {
          const content = tree.getById(optionContentId).v;

          expect(content).toEqual(aMaskedString);
        });

        test("still masks the placeholder of a select tag", () => {
          const placeholder = tree.getById(selectTagId).a.placeholder;

          expect(placeholder).toEqual(aMaskedString);
        });

        test("still masks the option label of a select tag", () => {
          const label = tree.getById(optionTagId).a.label;

          expect(label).toEqual(aMaskedString);
        });

        describe("because it's in the masking targets", () => {
          test("masks the title tag contents", () => {
            const content = tree.getById(titleContentId).v;

            expect(content).toEqual(aMaskedString);
          });
        });
      });
    });

    function fixTreeParents(node, parent) {
      node.p = parent || 0;
      if (!node.c) node.c = [];
      if (node.c.length > 0) {
        for (let i = 0; i < node.c.length; i++) {
          fixTreeParents(node.c[i], node.id);
        }
      }
      return node;
    }
  });
});
