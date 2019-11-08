/* eslint-env node */
import fs from "fs";
import path from "path";
import template from "lodash.template";
import * as trigConfig from "../../../clientconfig/productconfig/trigger/product_config";
import * as defConfig from "../../../clientconfig/productconfig/trigger/surveydef/def1";
import * as recConfig from "../../../clientconfig/productconfig/record/product_config";
import { setProductConfig, setGlobalConfig } from "../../fs/lib/configdefs";
import { locatorUpdate } from "../../fs/lib/locator";
import Invite from "../../invite/invite";
import RecordController from "../../record/recordcontroller";
import * as Sanitizer from "../../sanitize/sanitize";
import { loadCSS } from "../../utils/dom/css";
import { startup } from "../startup";
import { Singletons } from "../top";

// Turn this on to see console log messages!
const DEBUG = false;

// mock out network calls to load css and templates
jest.mock("../../utils/dom/css");

const inviteTemplate = template(
  fs.readFileSync(path.resolve("templates/trigger/desktopredesign/html/invite.html")).toString()
);

describe("Trigger", () => {
  let resolveRecordRequired;
  let resolveInviteRequired;
  let resolveCssLoaded;
  let resolveTemplateLoaded;

  let consoleWarnSpy;
  let consoleLogSpy;
  let consoleErrorSpy;

  beforeEach(() => {
    loadCSS.mockClear();

    if (!DEBUG) {
      consoleWarnSpy = jest.spyOn(global.console, "warn").mockImplementation(() => {});
      consoleLogSpy = jest.spyOn(global.console, "log").mockImplementation(() => {});
      consoleErrorSpy = jest.spyOn(global.console, "error").mockImplementation(() => {});
    }

    // having to set the global config like this will hopefully go away after 20.x
    setGlobalConfig({
      storage: "COOKIE",
      disable_cpps: [],
      products: { record: true, trigger: true },
      recUrl: "http://record/",
      sanitizeHTML: true,
      // todo add journey events config
    });

    setProductConfig("trigger", {
      config: trigConfig,
      surveydefs: [defConfig],
    });

    setProductConfig("record", recConfig);

    // Mock out web crypto api
    let nextv = 1;
    window.crypto = {
      getRandomValues(bytes) {
        for (let i = 0; i < bytes.length; i++) {
          // make the user-id predictable
          bytes[i] = nextv++;
        }
      },
    };

    // mock out locator methods
    locatorUpdate({
      normalizeUrl(url) {
        return url;
      },
      normalizeAssetUrl(url) {
        return url;
      },
    });

    // mock out _fsRequire
    window._fsRequire = (deps, cb) => {
      console.log(`REQUIRE: ${deps.join(", ")}`);

      // provide record
      if (deps[0] === "$fs.record.js") {
        resolveRecordRequired();
        return cb(RecordController);
      }

      // provide invite
      if (deps[0] === "$fs.invite.js") {
        resolveInviteRequired();
        return cb(Invite);
      }

      // provite the invite template html
      if (
        deps[0] === "$templates/trigger/desktopredesign/invite___html.js" &&
        deps[1] === "$fs.sanitize.js"
      ) {
        resolveTemplateLoaded();
        return cb(inviteTemplate, Sanitizer);
      }

      throw new Error(`Not expecting ${deps[0]} to be _fsRequire'd`);
    };

    // not sure why trigger calls this, but mocking it out
    window.fsReady = cb => cb();

    // mock out the URL api for record creating its web worker
    window.URL = {
      createObjectURL() {},
    };

    // mock out the web worker api (for now)
    window.Worker = class {
      addEventListener() {}

      postMessage() {}
    };

    // mock out the MutationObserver so it does nothing in record (for now)
    window.MutationObserver = class MutationObserver {
      observe() {}
    };

    loadCSS.mockImplementation((url, successcallback) => {
      resolveCssLoaded();
      successcallback();
    });
  });

  afterEach(() => {
    if (!DEBUG) {
      consoleWarnSpy.mockRestore();
      consoleLogSpy.mockRestore();
      consoleErrorSpy.mockRestore();
    }
  });

  test("presents an invite", async () => {
    const recordRequired = new Promise(resolve => (resolveRecordRequired = resolve));
    const inviteRequired = new Promise(resolve => (resolveInviteRequired = resolve));
    const cssLoaded = new Promise(resolve => (resolveCssLoaded = resolve));
    const templateLoaded = new Promise(resolve => (resolveTemplateLoaded = resolve));

    // initiate trigger startup sequence
    startup();
    // TODO: add a bunch of assertions that lock down the behaviour of trigger

    // first trigger will call the loadedEmitter shortly after starting up
    await new Promise(resolve => Singletons.loadedEmitter.subscribe(resolve, true, true));

    // then it _fsRequire's record
    await recordRequired;

    // then it _fsRequire's invite
    await inviteRequired;

    // then it fires the initializedEmitter
    await new Promise(resolve => Singletons.initializedEmitter.subscribe(resolve, true, true));

    // then invite loads the CSS
    await cssLoaded;

    // and also loads the template
    await templateLoaded;

    // then InviteSetup fires the inviteShownEmitter once the invite is presented
    await new Promise(resolve => Singletons.inviteShownEmitter.subscribe(resolve, true, true));
  });
});
