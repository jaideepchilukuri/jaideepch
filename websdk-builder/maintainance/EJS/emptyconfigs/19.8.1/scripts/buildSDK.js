const bityProm = require("bity-promise");
const bufferize = require("gulp-bufferize");
const chalk = require("chalk");
const exclude = require("gulp-ignore").exclude;
const fs = require("fs");
const gcallback = require("gulp-callback");
const greplace = require("gulp-replace");
const gulp = require("gulp");
const gulpif = require("gulp-if");
const gutil = require("gulp-util");
const header = require("gulp-header");
const jshint = require("gulp-jshint");
const path = require("path");
const pragma = require("gulp-pragma");
const prettify = require("gulp-jsbeautifier");
const promise = require("gulp-promise");
const runSequence = require("run-sequence");
const stream = require("stream");
const stylish = require("jshint-stylish");
const strftime = require("strftime");
const uglify = require("gulp-uglify");
const wrap = require("gulp-wrap");

const { pjson, clientProperties, isProd, isVeracode } = require("./SDKConfigs.js");

/**
 * Uglify settings
 * @type {{preserveComments: string}}
 */
const uglifySetts = {
  mangle: {
    reserved: ["utils", "fs", "Compress"],
  },
  output: {
    comments: function(node, comment) {
      if (comment.value.indexOf("@preserve") > -1 || comment.value.indexOf("@license") > -1) {
        return true;
      }
      return false;
    },
  },
};

/**
 * Prettify settings
 * @type {{indentSize: number}}
 */
const prettifySetts = {
  indentSize: 2,
};

/**
 * Build a JS project. Pass in a project object and a callback OR a promise
 * @param proj - Project Object
 * @param cb - Callback or promise
 */
var buildJSProject = function(codever, distloc, proj, projInfo, topdeps, writefile, cb) {
  var externprefix = "./extern",
    hasdeps = false,
    dpcount = 0,
    amdWrap = "_fsDefine([",
    p;

  if (!fs.existsSync(distloc)) {
    fs.mkdirSync(distloc);
  }

  for (let dp in topdeps) {
    if (dpcount > 0) {
      amdWrap += ", ";
    }
    amdWrap += "'" + dp + "'";
    dpcount++;
  }

  if (projInfo.deps && projInfo.deps.length > 0) {
    for (p = 0; p < projInfo.deps.length; p++) {
      if (
        typeof projInfo.deps[p] == "string" &&
        projInfo.deps[p].indexOf(".") > -1 &&
        projInfo.deps[p].indexOf("^") == -1
      ) {
        var depfname = projInfo.deps[p];
        amdWrap += ", _fsNormalizeUrl('" + depfname + "')";
      } else if (typeof projInfo.deps[p] == "string") {
        amdWrap += ", '" + projInfo.deps[p].replace(/\^/g, "") + "'";
      } else {
        amdWrap += ", '" + Object.keys(projInfo.deps[p])[0] + "'";
      }
    }
    amdWrap += "], function(";
    dpcount = 0;
    for (let dp in topdeps) {
      if (dpcount > 0) {
        amdWrap += ", ";
      }
      amdWrap += topdeps[dp];
      dpcount++;
    }

    for (p = 0; p < projInfo.deps.length; p++) {
      if (typeof projInfo.deps[p] == "string") {
        amdWrap += ", " + (projInfo.deps[p].split(".")[1] || projInfo.deps[p]);
      } else {
        amdWrap += ", " + projInfo.deps[p][Object.keys(projInfo.deps[p])[0]];
      }
    }
    amdWrap += ") {\n<%= contents %>\n});";
  } else {
    amdWrap += "], function(";
    dpcount = 0;
    for (var dp in topdeps) {
      if (dpcount > 0) {
        amdWrap += ", ";
      }
      amdWrap += topdeps[dp];
      dpcount++;
    }
    amdWrap += ") {\n";
    amdWrap += "<%= contents %>\n});";
  }

  var finalFiles = [],
    buildProm = new promise(),
    skipAMD = !!projInfo.skipAMD;

  // Handle when the code is ready
  buildProm.makePromises(["codeready"], function() {
    if (writefile) {
      for (var fli = 0; fli < finalFiles.length; fli++) {
        var fl = finalFiles[fli],
          flloc = distloc + "/" + fl.relative;
        try {
          fs.accessSync(distloc, fs.F_OK);
        } catch (e) {
          fs.mkdirSync(distloc);
        }
        //
        var fcontents = finalFiles[0].contents.toString("utf-8");
        finalFiles[0].contents = Buffer.from(fcontents);
        fs.writeFileSync(flloc, finalFiles[0].contents, "utf-8");
      }
    }
    process.nextTick(function() {
      if (cb) {
        cb(proj, finalFiles);
      }
    });
  });

  gulp
    .src([externprefix + "/clientcode/tags/" + codever + "/src/" + proj + "/**/*.js"])
    .pipe(exclude("**/test/**"))
    .pipe(jshint({ laxbreak: true }))
    .pipe(jshint.reporter(stylish))
    .pipe(concatFiles("fs." + proj.toLowerCase() + ".js", projInfo.files))
    .pipe(pragma({ amd: !skipAMD, notamd: !!skipAMD, debug: !isVeracode && !isProd }))
    .pipe(greplace(/\$\{versionTag\}/gi, pjson.version))
    .pipe(greplace(/\$\{events\}/gi, clientProperties.client.events))
    .pipe(gulpif(skipAMD, wrap("<%= contents %>"), wrap(amdWrap)))
    .pipe(header(getBuildHeader(projInfo.name, pjson), pjson))
    .pipe(
      gulpif(
        isProd,
        uglify(uglifySetts).on("error", function(err) {
          gutil.log(chalk.red("[Error]"), err.toString());
        }),
        prettify(prettifySetts)
      )
    )
    .pipe(
      bufferize(function(fl) {
        finalFiles.push(fl);
      })
    )
    .pipe(
      gcallback(function() {
        if (!hasdeps) {
          buildProm.deliverPromise("codeready");
        }
      })
    );
};

/**
 * Generates a text header for JavaScript files
 */
function getBuildHeader(projectName) {
  return (
    "/***************************************\n* @preserve" +
    "\n* ForeSee Web SDK: " +
    projectName +
    "\n* Built " +
    strftime("%B %d, %y %H:%M:%S") +
    "\n* Code version: " +
    pjson.code_version.toString() +
    "\n* Template version: " +
    pjson.version +
    (projectName === "Utils Library" ? "\n* Contains Pako (C) nodeca/pako on github" : "") +
    "\n***************************************/\n\n"
  );
}

function buildSDK(projectsToBuild, cb) {
  // Ensure that the destination folder is present
  if (!fs.existsSync(pjson.build.dist)) {
    fs.mkdirSync(pjson.build.dist);
  }
  if (!fs.existsSync(pjson.build.dist + "/code")) {
    fs.mkdirSync(pjson.build.dist + "/code");
  }
  if (!fs.existsSync(pjson.build.dist + "/code/" + pjson.code_version)) {
    fs.mkdirSync(pjson.build.dist + "/code/" + pjson.code_version);
  }
  if (isProd) {
    console.log(chalk.magenta("***********************************************************"));
    console.log(
      chalk.magenta("*******") +
        chalk.yellow(" PROD CODE") +
        chalk.magenta("        **********************************")
    );
    console.log(chalk.magenta("***********************************************************"));
  } else {
    console.log(chalk.magenta("***********************************************************"));
    console.log(
      chalk.magenta("*******") +
        chalk.gray(" DEBUG CODE") +
        chalk.magenta("         ********************************")
    );
    console.log(chalk.magenta("***********************************************************"));
  }

  // Run tasks in sequence
  runSequence(
    ["_gateway", "_templates", "_customtemplates", "_images", "_html", "_clientassets"],
    function() {
      var projsToBuild = Object.keys(projectsToBuild),
        projProm = new bityProm(
          function() {
            if (cb) {
              cb();
            }
          },
          function() {
            throw new Error("Problem with SDK build.");
          },
          30000
        );

      // Make promises
      projProm.make(projsToBuild);

      var distloc = pjson.build.dist + "/code/" + pjson.code_version,
        codever = pjson.code_version,
        projdeps = {
          require: "require",
          fs: "fs",
        };

      // Copy the gateway file over
      fs.writeFileSync(
        distloc + "/fs.gateway.js",
        fs.readFileSync(
          pjson.build.extern +
            "/gateway/tags/" +
            pjson.gateway_version +
            "/dist/gateway" +
            (isProd ? ".min" : "") +
            ".js",
          "utf-8"
        )
      );

      // Loop over the projects and build them all
      for (var i = 0; i < projsToBuild.length; i++) {
        var proj = projsToBuild[i];
        buildJSProject(
          codever,
          distloc,
          proj,
          projectsToBuild[proj],
          projdeps,
          true,
          (function(pj) {
            return function() {
              projProm.resolve(pj);
            };
          })(proj)
        );
      }
    }
  );
}

// simple as possible plugin to concat files in the same order
// as a list of files given
function concatFiles(finalName, fileList) {
  var count = fileList.length;
  var files = {};
  var firstFile = null;
  var outstream = new stream.Transform({ objectMode: true });
  var done = false;

  outstream._transform = function(file, unused, callback) {
    // grab the longest match from the list of deps
    var unixpath = file.path.replace(/\\/g, "/");
    var fn = fileList.filter(v => unixpath.endsWith(v)).sort((a, b) => b.length - a.length)[0];

    if (fn && !files[fn]) {
      firstFile = firstFile || file;
      files[fn] = file;
      count--;
      if (count <= 0 && !done) {
        done = true;
        var joinedContents = fileList
          .map(fn => {
            var fl = files[fn];
            if (!fl) {
              throw new Error("couldn't find " + fn);
            }
            return "\n\n/******** FILE: " + fn + " ********/\n\n\n" + fl.contents.toString("utf8");
          })
          .join("\n");

        var finalFile = new gutil.File({
          cwd: firstFile.cwd,
          base: firstFile.base,
          path: path.join(firstFile.base, finalName),
          contents: Buffer.from(joinedContents),
        });

        console.log(
          "Reconciled " +
            fileList.length.toString().yellow +
            " files for " +
            finalName.magenta +
            " (" +
            joinedContents.length +
            " bytes)."
        );

        this.push(finalFile);
      }
    }
    callback(null);
  };

  return outstream;
}

module.exports = { buildJSProject, buildSDK };
