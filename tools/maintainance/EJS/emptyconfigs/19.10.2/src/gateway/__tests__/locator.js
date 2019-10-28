import {
  globalConfig,
  assetLocation,
  codeLocation,
  gwConfigOverride,
  hasSSL,
  home,
  isProduction,
  isSelfHosted,
  makeAssetURI,
  makeURI,
  tagVersion,
} from "../../fs/index";
import { locator, reset } from "../lib/locator";

/**
 * Set up the script tag the locator script looks for.
 */
function provideGWScriptTag(attrs) {
  const script = document.createElement("script");
  script.setAttribute("data-role", "gateway");
  script.setAttribute("data-vendor", "fs");

  for (const key in attrs) {
    script.setAttribute(key, attrs[key]);
  }

  if (!attrs.src) {
    script.setAttribute("src", "");
  }

  document.head.appendChild(script);
}

/**
 * Test the gateway locator script in the various production modes
 * one might find it in.
 */
describe("locator", () => {
  afterEach(() => {
    // This is a global... some tests change this
    // so make sure we change it back
    globalConfig.codeVer = "1.2.3";

    reset();
  });

  // normal way the SDK is booted
  describe("with standard script tag setup", () => {
    beforeEach(() => {
      provideGWScriptTag({
        src: "https://local/site/normal/staging/gateway.js",
      });
      locator.locateGW();
    });

    test("assetLocation is undefined", () => {
      expect(assetLocation).toBeUndefined();
    });

    test("codeLocation is undefined", () => {
      expect(codeLocation).toBeUndefined();
    });

    test("hasSSL is true", () => {
      expect(hasSSL).toEqual(true);
    });

    test("isSelfHosted is false", () => {
      expect(isSelfHosted).toEqual(false);
    });

    test("home is the gateway script folder", () => {
      expect(home).toEqual("https://local/site/normal/staging/");
    });

    test("isProduction is false", () => {
      expect(isProduction).toEqual(false);
    });

    test("makeURI returns a the location of the code relative to the gateway script", () => {
      expect(makeURI("$fs.test.js")).toEqual("https://local/code/1.2.3/fs.test.js");
    });

    test("makeAssetURI returns client assets at the right location", () => {
      expect(makeAssetURI("trigger/test.png")).toEqual(
        "https://local/site/normal/staging/trigger/test.png"
      );
    });
  });

  // I believe self-hosted (on-prem) will set up the gateway this way
  describe("with script tag setup with location overrides", () => {
    beforeEach(() => {
      provideGWScriptTag({
        src: "http://local/site/local/production/gateway.js",
        "data-product-assets": "test.asset.location/",
        "data-codelocation": "test.code.location/",
        "data-hasssl": "false",
        "data-isselfhosted": "true",
      });
      locator.locateGW();
    });

    test("assetLocation is the overridden asset location", () => {
      expect(assetLocation).toEqual("test.asset.location/");
    });

    test("codeLocation is the overridden code location", () => {
      expect(codeLocation).toEqual("test.code.location/");
    });

    test("hasSSL is false", () => {
      expect(hasSSL).toEqual("false");
    });

    test("isSelfHosted is true", () => {
      expect(isSelfHosted).toEqual(true);
    });

    test("home is the gw folder", () => {
      expect(home).toEqual("http://local/site/local/production/");
    });

    test("isProduction is true", () => {
      expect(isProduction).toEqual(true);
    });

    test("makeURI returns the overridden code location", () => {
      expect(makeURI("$fs.test.js")).toEqual("test.code.location/fs.test.js");
    });

    test("makeAssetURI returns the overridden asset location", () => {
      expect(makeAssetURI("trigger/test.png")).toEqual("test.asset.location/trigger/test.png");
    });
  });

  // This is how node_replay sets up replays
  describe("test no slash on asset/codelocation", () => {
    beforeEach(() => {
      provideGWScriptTag({
        src: "http://local/site/local/production/gateway.js",
        "data-product-assets": "test.asset.location",
        "data-codelocation": "test.code.location",
        "data-hasssl": "false",
        "data-isselfhosted": "true",
      });
      locator.locateGW();
    });

    test("assetLocation is the overridden asset location", () => {
      expect(assetLocation).toEqual("test.asset.location/");
    });

    test("codeLocation is the overridden code location", () => {
      expect(codeLocation).toEqual("test.code.location/");
    });

    test("home is the gw folder", () => {
      expect(home).toEqual("http://local/site/local/production/");
    });

    test("makeURI returns the overridden code location", () => {
      expect(makeURI("$fs.test.js")).toEqual("test.code.location/fs.test.js");
    });

    test("makeAssetURI returns the overridden asset location", () => {
      expect(makeAssetURI("/test.png")).toEqual("test.asset.location/test.png");
    });
  });

  // as seen in standalone (weblink) surveys, as well as tracker and feedback popups
  describe("with standalone head-tag query parameter setup", () => {
    beforeEach(() => {
      provideGWScriptTag({});

      // the name of the param to query is an attribute on the head
      document.head.setAttribute("data-product-assets", "assetparam");
      document.head.setAttribute("data-codelocation", "codeparam");
      document.head.setAttribute("data-productconfig", "cfgparam");
      document.head.setAttribute("data-hasssl", "sslparam");
      document.head.setAttribute("data-isselfhosted", "shparam");
      document.head.setAttribute("data-fsgatewaylocparam", "gwlparam");
      document.head.setAttribute("data-codeversion", "cvparam");

      // the url will contain the query parameters specified above
      window.history.pushState(
        {},
        "test url",
        `/test?${[
          "assetparam=param.asset.loc",
          "codeparam=param.code.loc",
          "cfgparam=param.cfg.ovr",
          "sslparam=false",
          "shparam=true",
          `gwlparam=${encodeURIComponent("http://local/site/standalone/production/gateway.js")}`,
          "cvparam=2.3.4",
        ].join("&")}`
      );

      locator.locateGW();
    });

    test("assetLocation is overridden by the query param", () => {
      expect(assetLocation).toEqual("param.asset.loc/");
    });

    test("codeLocation is overridden by the query param", () => {
      expect(codeLocation).toEqual("param.code.loc/");
    });

    test("gwConfigOverride is overridden by the query param", () => {
      expect(gwConfigOverride).toEqual("param.cfg.ovr");
    });

    test("hasSSL is false", () => {
      // the code that looks at this explicitly looks for the string "false"
      expect(hasSSL).toEqual("false");
    });

    test("isSelfHosted is true", () => {
      expect(isSelfHosted).toEqual(true);
    });

    test("home is the overridden value", () => {
      expect(home).toEqual("http://local/site/standalone/production/");
    });

    test("isProduction is true", () => {
      expect(isProduction).toEqual(true);
    });

    test("tagVersion is overridden", () => {
      expect(tagVersion).toEqual("2.3.4");
    });

    test("makeURI returns overridden code location", () => {
      expect(makeURI("$fs.test.js")).toEqual("param.code.loc/fs.test.js");
    });

    test("makeAssetURI returns overridden asset location", () => {
      expect(makeAssetURI("trigger/test.png")).toEqual("param.asset.loc/trigger/test.png");
    });
  });

  // This is the environment that the tracker window and feedback popups will be in.
  // Had to add this test because changes to the locator kept breaking the tracker window
  // asset lookup.
  describe("with tracker / feedback popup setup", () => {
    beforeEach(() => {
      provideGWScriptTag({
        src: "fs.gateway.js",
      });

      // the name of the param to query is an attribute on the head
      document.head.setAttribute("data-skipfsinit", "true");
      document.head.setAttribute("data-surveyurl", "_svu_");
      document.head.setAttribute("data-codeversion", "_cv_");
      document.head.setAttribute("data-analyticsurl", "_au_");
      document.head.setAttribute("data-product-assets", "_pa_");
      document.head.setAttribute("data-isselfhosted", "_issh_");

      // the url will contain the query parameters specified above
      window.history.pushState(
        {},
        "test url",
        `/code/19.9.1-qa.5/fs.tracker.html?${[
          "domain=localhost",
          "gw=%2Ftrigger%2F__gwtest__",
          "brain_url=https%3A%2F%2Fbrain.foresee.com",
          "fsrlocale=en",
          "_svu_=https%3A%2F%2Fsurvey-dev.foreseeresults.com%2Fsurvey%2Fdisplay",
          "_cv_=19.9.1-qa.5",
          "_issh_=false",
          "_vt_=19.9.1-qa.5",
          "_au_=https%3A%2F%2Fqal-analytics.foresee.com%2Fingest%2Fevents",
          "_pa_=undefined",
        ].join("&")}`
      );

      locator.locateGW();
    });

    test("assetLocation is undefined", () => {
      expect(assetLocation).toBeUndefined();
    });

    test("codeLocation is undefined", () => {
      expect(codeLocation).toBeUndefined();
    });

    test("gwConfigOverride is undefined", () => {
      expect(gwConfigOverride).toBeUndefined();
    });

    test("hasSSL is false", () => {
      // the code that looks at this explicitly looks for the string "false"
      expect(hasSSL).toEqual("false");
    });

    test("isSelfHosted is false", () => {
      expect(isSelfHosted).toEqual(false);
    });

    test("home is the overridden value", () => {
      expect(home).toEqual("http://localhost/code/19.9.1-qa.5/");
    });

    test("isProduction is false", () => {
      expect(isProduction).toEqual(false);
    });

    test("tagVersion is overridden", () => {
      expect(tagVersion).toEqual("19.9.1-qa.5");
    });

    test("makeURI returns overridden code location", () => {
      expect(makeURI("$fs.test.js")).toEqual("http://localhost/code/19.9.1-qa.5/fs.test.js");
    });

    test("makeAssetURI returns overridden asset location", () => {
      expect(makeAssetURI("trigger/test.png")).toEqual(
        "http://localhost/code/19.9.1-qa.5/trigger/test.png"
      );
    });
  });

  // This is the environment that the tracker window will be in when selfhosted.
  // The subtlety is about the code not being located on the origin of the URL
  describe("with tracker on selfhosted and need code location override", () => {
    beforeEach(() => {
      provideGWScriptTag({
        src: "fs.gateway.js",
      });

      // the name of the param to query is an attribute on the head
      document.head.setAttribute("data-skipfsinit", "true");
      document.head.setAttribute("data-surveyurl", "_svu_");
      document.head.setAttribute("data-codeversion", "_cv_");
      document.head.setAttribute("data-analyticsurl", "_au_");
      document.head.setAttribute("data-product-assets", "_pa_");
      document.head.setAttribute("data-isselfhosted", "_issh_");
      document.head.setAttribute("data-codelocation", "_cl_");

      const codeLocation = "/extra/path-segments/leading/to/code/19.9.1-qa.5/";

      // the url will contain the query parameters specified above
      window.history.pushState(
        {},
        "test url",
        `/extra/path-segments/leading/to/code/19.9.1-qa.5/fs.tracker.html?${[
          "domain=localhost",
          "gw=%2Ftrigger%2F__gwtest__",
          "brain_url=https%3A%2F%2Fbrain.foresee.com",
          "fsrlocale=en",
          "_svu_=https%3A%2F%2Fsurvey-dev.foreseeresults.com%2Fsurvey%2Fdisplay",
          "_cv_=19.9.1-qa.5",
          "_issh_=true",
          "_vt_=19.9.1-qa.5",
          "_au_=https%3A%2F%2Fqal-analytics.foresee.com%2Fingest%2Fevents",
          "_pa_=undefined",
          `_cl_=${encodeURIComponent(codeLocation)}`,
        ].join("&")}`
      );

      locator.locateGW();
    });

    test("assetLocation is undefined", () => {
      expect(assetLocation).toBeUndefined();
    });

    test("codeLocation is set", () => {
      expect(codeLocation).toEqual(codeLocation);
    });

    test("gwConfigOverride is undefined", () => {
      expect(gwConfigOverride).toBeUndefined();
    });

    test("hasSSL is false", () => {
      // the code that looks at this explicitly looks for the string "false"
      expect(hasSSL).toEqual("false");
    });

    test("isSelfHosted is true", () => {
      expect(isSelfHosted).toEqual(true);
    });

    test("home is the overridden value", () => {
      expect(home).toEqual("http://localhost/extra/path-segments/leading/to/code/19.9.1-qa.5/");
    });

    test("isProduction is false", () => {
      expect(isProduction).toEqual(false);
    });

    test("tagVersion is overridden", () => {
      expect(tagVersion).toEqual("19.9.1-qa.5");
    });

    test("makeURI returns something plausible", () => {
      // not sure this is correct
      expect(makeURI("$fs.test.js")).toEqual(
        "/extra/path-segments/leading/to/code/19.9.1-qa.5/fs.test.js"
      );
    });

    test("makeAssetURI returns overridden asset location", () => {
      expect(makeAssetURI("trigger/test.png")).toEqual(
        "http://localhost/extra/path-segments/leading/to/code/19.9.1-qa.5/trigger/test.png"
      );
    });
  });

  // This is mainly to catch leaked globals, and to assert defaults
  describe("before locator.locateGW()", () => {
    test("assetLocation is undefined", () => {
      expect(assetLocation).toBeUndefined();
    });

    test("codeLocation is undefined", () => {
      expect(codeLocation).toBeUndefined();
    });

    test("gwConfigOverride is null", () => {
      expect(gwConfigOverride).toBeNull();
    });

    test("hasSSL is true", () => {
      expect(hasSSL).toEqual(true);
    });

    test("isSelfHosted is false", () => {
      expect(isSelfHosted).toEqual(false);
    });

    test("home is empty", () => {
      expect(home).toEqual("");
    });

    test("isProduction is false", () => {
      expect(isProduction).toEqual(false);
    });

    test("tagVersion is 1.2.3", () => {
      expect(tagVersion).toEqual("1.2.3");
    });

    test("makeURI returns something plausible", () => {
      // not sure this is correct
      expect(makeURI("$fs.test.js")).toEqual("//code/1.2.3/fs.test.js");
    });

    test("makeAssetURI returns the asset unchanged", () => {
      // this could be a source of bugs
      expect(makeAssetURI("trigger/test.png")).toEqual("trigger/test.png");
    });
  });

  // this is only used in replay
  test.todo("embedAttrs");
});
