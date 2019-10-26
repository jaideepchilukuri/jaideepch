/* eslint-env node */
// ES6 methods are safe to use in Node>=10
/* eslint-disable es5/no-es6-methods, es5/no-es6-static-methodsm, no-process-env, global-require */

const conditional = require("rollup-plugin-conditional");
const stripCode = require("rollup-plugin-strip-code");
const { terser } = require("./scripts/terserPlugin");
const bundleSize = require("rollup-plugin-bundle-size");
const babel = require("rollup-plugin-babel");
const pjson = require("./package.json");
const path = require("path");

const buildEnv = process.env.NODE_ENV || "development";
const isVeracode = !!process.env.VERACODE;
const isProd = buildEnv === "production";
const skipBabel = process.argv.includes("--nobabel");

const VERSION = process.env.VERSION_OVERRIDE || pjson.version;
const BASEDIR = `src`;
const DISTDIR = path.join("dist", "code", VERSION);

// TODO: it would be nice to automatically determine this information from
// the directory structure as well as a standard entry file (${name}.js?)
const components = [
  {
    name: "gateway",
    desc: "Gateway Script",
    entry: "index.js",
  },
  {
    name: "utils",
    desc: "Utils Library",
    entry: "utils.js",
  },
  { name: "compress", desc: "Compression Library", entry: "compress.js" },
  {
    name: "record",
    desc: "Session Record",
    entry: "recordcontroller.js",
  },
  {
    name: "recordworker",
    desc: "Record Worker",
    entry: "recordworker.js",
  },
  { name: "replay", desc: "Replay JavaScript", entry: "replay.js" },
  {
    name: "survey",
    desc: "Survey",
    entry: "survey.js",
  },
  { name: "feedback", desc: "Feedback", entry: "startup.js" },
  {
    name: "feedbackreport",
    desc: "Feedback Reporting UI",
    entry: "startup.js",
  },
  { name: "feedbacksurvey", desc: "Feedback Standalone Survey", entry: "startup.js" },
  {
    name: "invite",
    desc: "Invitation Presenter",
    entry: "invite.js",
  },
  { name: "mouseoff", desc: "mouseoff", entry: "mouseoff.js" },
  { name: "optout", desc: "Opt-Out", entry: "startup.js" },
  {
    name: "svadmin",
    desc: "Admin Panel",
    entry: "startup.js",
  },
  { name: "tracker", desc: "Tracker Window", entry: "startup.js" },
  {
    name: "trigger",
    desc: "Trigger",
    entry: "startup.js",
  },
  { name: "storageupgrade", desc: "Storage Upgrade", entry: "storageupgrade.js" },
  { name: "shortsurvey", desc: "Short Survey Presenter", entry: "presenter.js" },
  { name: "sanitize", desc: "HTML Sanitizer", entry: "sanitize.js" },
];

const fsModule = path.join(__dirname, BASEDIR, "fs", "index.js");
const utilsModule = path.join(__dirname, BASEDIR, "utils", "utils.js");
const compressModule = path.join(__dirname, BASEDIR, "compress", "compress.js");
const surveyModule = path.join(__dirname, BASEDIR, "survey", "survey.js");

const componentBuildInstructions = components.map(({ name, desc, entry }) => ({
  input: path.join(name, entry),
  output: {
    name: name,
    file: path.join(DISTDIR, `fs.${name}.js`),

    // concat everything together into an iife
    // this is later transformed into AMD by a plugin
    format: "iife",

    // don't add code to interop with es6 modules
    interop: false,

    // don't output 'use strict'
    strict: false,

    // slight speed boost
    indent: false,

    banner: makeBanner(name, desc),

    globals: id => {
      if (id.includes(`${path.sep}fs${path.sep}`)) return "fs";
      if (id.includes(`${path.sep}utils${path.sep}`)) return "utils";
      if (id.includes(`${path.sep}survey${path.sep}`)) return "fsSurvey";
      return id;
    },
  },
  external: [
    "require",
    "config",
    "recordconfig",
    "triggerconfig",
    "feedbackconfig",
    name === "gateway" || name === "recordworker" ? "nevermind" : fsModule,
    name === "utils" || name === "recordworker" ? "nevermind" : utilsModule,
    name === "compress" ? "nevermind" : compressModule,
    name === "survey" ? "nevermind" : surveyModule,
  ],

  plugins: [
    conditional(!skipBabel, [
      babel({
        exclude: path.join("node_modules", "**"),
      }),
    ]),

    // resolve code location
    resolveModuleNames(),

    // strip debugging code
    conditional(isProd || isVeracode, [
      stripCode({
        start_comment: "pragma:DEBUG_START",
        end_comment: "pragma:DEBUG_END",
      }),
    ]),

    // transform IFFE format into AMD format for gateway loading
    conditional(name !== "gateway" && name !== "recordworker", [fsAmdWrapper(name)]),

    // minify production code
    conditional(isProd && name !== "gateway", [
      terser({
        ecma: 5,
        safari10: true,
        mangle: {
          reserved: [],
        },
        output: {
          comments: (node, comment) => /@(preserve|license)/.test(comment.value),
        },
      }),
    ]),

    bundleSize(),

    // minify / copy gateway
    conditional(name === "gateway", [fsGatewayBuilder()]),
  ],
}));

module.exports = componentBuildInstructions;

/**
 * Generates a text header for JavaScript files
 */
function makeBanner(name, componentDesc) {
  const today = new Date().toLocaleString("en-US", {
    hour12: false,
    month: "long",
    day: "2-digit",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    timeZoneName: "short",
  });

  return [
    "/***************************************",
    " * @preserve",
    ` * Copyright (c) ${new Date().getFullYear()} Verint Systems, Inc. All rights reserved.`,
    ` * ForeSee Web SDK: ${componentDesc}`,
    ` * Version: ${VERSION}`,
    ` * Built: ${today}`,
    " ***************************************/",
  ]
    .filter(ln => ln.length > 0)
    .join("\n");
}

function resolveModuleNames() {
  return {
    name: "resolveModuleNames",
    resolveId(importee, importer) {
      if (importee.startsWith("./") || importee.startsWith("../")) {
        return ensureExt(path.resolve(path.dirname(importer), importee));
      }

      return ensureExt(`${BASEDIR}/${importee}`);

      function ensureExt(fn) {
        return /\.js$/.test(fn) ? fn : `${fn}.js`;
      }
    },
  };
}

/**
 * Rollup plugin which will wrap the generated IIFE in _fsDefine()
 */
function fsAmdWrapper(name) {
  const plainImports = "require fs config triggerconfig recordconfig".split(" ");
  return {
    name: "fsAmdWrapper",
    renderChunk(code, { imports, exports }) {
      const deps = imports.map(imp => {
        if (imp === "config") {
          if (name === "trigger" || name === "svadmin") {
            return `"triggerconfig"`;
          } else if (name === "feedback" || name === "feedbackreport") {
            return `"feedbackconfig"`;
          } else {
            throw Error(`Not sure which config for ${name}`);
          }
        }
        if (plainImports.includes(imp)) {
          return `"${imp}"`;
        }
        if (imp === fsModule) {
          return '"fs"';
        }
        if (imp === utilsModule) {
          return '_fsNormalizeUrl("$fs.utils.js")';
        }
        if (imp === surveyModule) {
          return '_fsNormalizeUrl("$fs.survey.js")';
        }
        if (imp === compressModule) {
          return '_fsNormalizeUrl("$fs.compress.js")';
        }
        return `_fsNormalizeUrl("$fs.${imp}.js")`;
      });

      const imps = imports.map(imp => {
        if (imp === fsModule) {
          return "fs";
        }
        if (imp === utilsModule) {
          return "utils";
        }
        if (imp === surveyModule) {
          return "fsSurvey";
        }
        if (imp === compressModule) {
          return "zlib";
        }
        return imp;
      });

      if (exports.length) {
        deps.push('"exports"');
        imps.push("exports");
      }

      // fix bug in rollup globals matching
      code = code.replace(/\bindex_js\b/g, "fs");
      code = code.replace(/\butils_js\b/g, "utils");
      code = code.replace(/\bsurvey_js\b/g, "fsSurvey");
      code = code.replace(/\bcompress_js\b/g, "zlib");

      const lines = code.split("\n");
      const iifeStartIndex = lines.findIndex(l => l.includes("(function"));
      const depStr = deps.join(", ");
      const impStr = imps.join(", ");
      lines[iifeStartIndex] = `_fsDefine([${depStr}], function(${impStr}) {`;
      lines[lines.length - 1] = "});";
      return `${lines.join("\n")}\n`;
    },
  };
}

/**
 * Plugin to do the extra special steps required to build the gateway with rollup
 *
 * TODO: could refactor this to be more the rollup way
 */
function fsGatewayBuilder() {
  const Terser = require("terser");
  const fs = require("fs").promises;

  return {
    name: "fsGatewayBuilder",

    async writeBundle(bundle) {
      const fileName = path.join(DISTDIR, "fs.gateway.js");
      const gwsrc = bundle["fs.gateway.js"].code;

      // put the built files for the gateway under the dist/gateway folder
      const gatewaymin = path.join(DISTDIR, "gateway.min.js");
      const gateway = path.join(DISTDIR, "gateway.js");

      // make a copy of fs.gateway.js as gateway.js
      await fs.writeFile(gateway, gwsrc);

      if (!isProd) {
        // if we aren't running the minifier just make another copy as gateway.min.js
        await fs.writeFile(gatewaymin, gwsrc);
      } else {
        // Otherwise we need to minify the gateway in the special gateway way
        // Note: unlike rollup-plugin-terser this isn't done in a separate thread,
        // we may want to fix that in the future
        const res = Terser.minify(gwsrc, {
          ecma: 5,
          safari10: true,
          mangle: {
            reserved: ["productConfig", "globalConfig"],
          },
          output: {
            comments: (node, comment) => /@(preserve|license)/.test(comment.value),
          },
        });

        // throw the error if there is one
        if (res.error) {
          console.error("Error minifying gw:", res.error);
          throw res.error;
        }

        // copy the minfied version to fs.gateway.js and gateway.min.js
        await fs.writeFile(gatewaymin, res.code);
        await fs.writeFile(fileName, res.code);
      }
    },
  };
}
