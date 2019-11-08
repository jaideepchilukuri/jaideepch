import { createHash } from "crypto";
import { setGlobalConfig } from "../fs/lib/configdefs";
import { checkIntegrity } from "./integrity";

const configJsonText = "config.json text";

// generate with:
// echo -n "config.json text" | openssl dgst -sha256 -binary | openssl base64 -A
// slightly modified from https://www.srihash.org/
const hashOfConfigJson = "sha256-9ovp5BfnJrYwaPG5fHI0OU+P3URIzsZWBtnOO+K4g/E=";

const sha384 = "sha384-v2b+GZeBkooZ/dyUYOAvDikYdAZB3aOIZAqFUL57v6LHepgVHlcchlNOcOLqKoFD";

const badHash = "sha256-mtlqZC3uayZTWs3zf1vmYrn+RtgzR8tP/16e5aOqA7A=";

describe("config.json integrity checking", () => {
  function allTests() {
    let hashes;

    beforeEach(() => {
      setGlobalConfig({
        integrityHashLocation: "fsrIntegrity.hashes",
      });

      hashes = [];
      window.fsrIntegrity = { hashes };
    });

    it("refuses to load if hashes is empty", async () => {
      expect(await checkIntegrity(configJsonText)).toBeFalsy();
    });

    it("loads if hash matches", async () => {
      hashes.push(hashOfConfigJson);
      expect(await checkIntegrity(configJsonText)).toBeTruthy();
    });

    it("loads if hashes is a single value", async () => {
      window.fsrIntegrity.hashes = hashOfConfigJson;
      expect(await checkIntegrity(configJsonText)).toBeTruthy();
    });

    it("supports sha384 too", async () => {
      hashes.push(sha384);
      expect(await checkIntegrity(configJsonText)).toBeTruthy();
    });

    it("fails check if hash doesn't match", async () => {
      hashes.push(badHash);
      expect(await checkIntegrity(configJsonText)).toBeFalsy();
    });

    it("passes check if at least one hash matches", async () => {
      hashes.push(badHash);
      hashes.push(hashOfConfigJson);
      expect(await checkIntegrity(configJsonText)).toBeTruthy();
    });

    it("can handle multiple hash algorithms", async () => {
      hashes.push(badHash);
      hashes.push(sha384);
      expect(await checkIntegrity(configJsonText)).toBeTruthy();
    });
  }

  describe("With insecure connection making subtle undefined", () => {
    let consoleWarnSpy;
    beforeEach(() => {
      // subtle is undefined in pages not loaded over https
      window.crypto = {
        subtle: undefined,
      };

      setGlobalConfig({
        integrityHashLocation: "fsrIntegrity.hashes",
      });

      window.fsrIntegrity = { hashes: ["don't care"] };

      // suppress warning message in tests
      consoleWarnSpy = jest.spyOn(window.console, "warn").mockImplementation(() => {});
    });

    afterEach(() => {
      consoleWarnSpy.mockRestore();
    });

    it("doesn't error and loads anyway", async () => {
      expect(await checkIntegrity(configJsonText)).toBeTruthy();
    });
  });

  describe("With standard webcrypto impl", () => {
    beforeEach(() => {
      // stub the standard web crypto impl
      window.crypto = {
        subtle: {
          digest(algorithm, data) {
            return new Promise(resolve => {
              const algo = algorithm.toLowerCase().replace("-", "");
              const hash = createHash(algo);
              hash.update(data);
              const buffer = hash.digest().buffer;
              resolve(buffer);
            });
          },
        },
      };
    });

    describe("Runs all the tests", allTests);
  });

  describe("With IE11 webcrypto impl", () => {
    beforeEach(() => {
      // stub the ie11 web crypto impl
      // the primary difference is that ie11 doesn't have promises
      // so it returns a "CryptoOperation" instead
      window.crypto = {
        subtle: {
          digest(algorithm, data) {
            const cryptoOperation = {
              oncomplete: null,
              onerror: null,
            };
            // on the next tick
            setTimeout(() => {
              if (!cryptoOperation.onerror) throw new Error("Catch errors!");
              const algo = algorithm.toLowerCase().replace("-", "");
              const hash = createHash(algo);
              hash.update(data);
              cryptoOperation.result = hash.digest().buffer;
              cryptoOperation.oncomplete();
            }, 0);
            return cryptoOperation;
          },
        },
      };
    });

    describe("Runs all the tests", allTests);
  });

  describe("Without integrityHashLocation set", () => {
    it("returns true if undefined", async () => {
      setGlobalConfig({
        integrityHashLocation: undefined,
      });

      expect(await checkIntegrity(configJsonText)).toBeTruthy();
    });

    it("returns true if null", async () => {
      setGlobalConfig({
        integrityHashLocation: null,
      });

      expect(await checkIntegrity(configJsonText)).toBeTruthy();
    });
  });
});
