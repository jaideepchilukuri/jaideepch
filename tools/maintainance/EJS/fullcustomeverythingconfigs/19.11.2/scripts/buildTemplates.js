/* eslint-env node */

const fs = require("fs");
const path = require("path");
const bityProm = require("bity-promise");
const gulp = require("gulp");
const cssmin = require("gulp-cssmin");
const htmlmin = require("gulp-htmlmin");
const promise = require("gulp-promise");
const sass = require("gulp-sass");
const template = require("lodash.template");
const { minify } = require("terser");
const through = require("through2");

const fsGulpUtil = require("./fsgulputils");

function buildTemplates(dist, version, cb) {
  const templateProducts = fsGulpUtil.getDirectories("./templates/").filter(t => t !== "custom");

  const rootSrcPath = "templates/";

  const getDestinationFilePath = (product, dir) =>
    path.join(dist, "/code/", version, "/templates/", product, "/", dir);

  return build(templateProducts, rootSrcPath, getDestinationFilePath, cb);
}

function buildCustomTemplates(pjson, cb) {
  const templateProducts = fsGulpUtil.getDirectories("./templates/custom/");

  const rootSrcPath = "templates/custom/";

  const getDestinationFilePath = (product, dir) =>
    path.join(pjson.build.dist, "/", product, "/templates/", dir);

  return build(templateProducts, rootSrcPath, getDestinationFilePath, cb);
}

function build(templateProducts, rootSrcPath, getDestinationFilePath, cb) {
  function handleCallback(cb) {
    if (cb) {
      return cb();
    } else {
      return function noop() {};
    }
  }

  if (!templateProducts || templateProducts === null) {
    throw new Error(
      "Failed building templates; templateProducts received falsy value. Perhaps the templates folder is missing?"
    );
  }

  if (templateProducts.length === 0) {
    handleCallback(cb);
    return;
  }

  const templateProm = new bityProm(
    () => {
      handleCallback(cb);
    },
    function promFail() {
      throw new Error("Failed building the templates.");
    },
    10000
  );
  templateProm.make(templateProducts);

  // Loop through each subfolder, and build the templates inside
  for (let p = 0; p < templateProducts.length; p++) {
    const srcpath = path.join(rootSrcPath, templateProducts[p], "/");
    const dirs = fs.readdirSync(srcpath).filter(function(file) {
      return fs.statSync(path.join(srcpath, file)).isDirectory();
    });
    const promiselist = [];
    const myProm = new promise();

    if (dirs.length == 0) {
      templateProm.resolve(templateProducts[p]);
    }

    for (let i = 0; i < dirs.length; i++) {
      promiselist.push(`sass___${dirs[i]}`);
      promiselist.push(`img___${dirs[i]}`);
      promiselist.push(`font___${dirs[i]}`);
      promiselist.push(`assets___${dirs[i]}`);
      promiselist.push(`html___${dirs[i]}`);
    }

    // Set up the promises
    myProm.makePromises(
      promiselist,
      (function(prod) {
        return function() {
          templateProm.resolve(prod);
        };
      })(templateProducts[p])
    );

    for (let i = 0; i < dirs.length; i++) {
      const destfiles = getDestinationFilePath(templateProducts[p], dirs[i]);
      gulp
        .src([
          path.join(srcpath, dirs[i], "/sass/main.scss"),
          path.join(srcpath, dirs[i], "/sass/light.scss"),
        ])
        .pipe(
          sass().on("error", function() {
            console.log("SASS ERROR: ", arguments);
          })
        )
        .pipe(cssmin())
        .pipe(gulp.dest(destfiles))
        .pipe(myProm.deliverGulpPromise(`sass___${dirs[i]}`));

      gulp
        .src(path.join(srcpath, dirs[i], "/images/**/*.*"))
        .pipe(gulp.dest(destfiles))
        .pipe(myProm.deliverGulpPromise(`img___${dirs[i]}`));

      gulp
        .src(path.join(srcpath, dirs[i], "/fonts/**/*.*"))
        .pipe(gulp.dest(destfiles))
        .pipe(myProm.deliverGulpPromise(`font___${dirs[i]}`));

      gulp
        .src(path.join(srcpath, dirs[i], "/assets/**/*.*"))
        .pipe(gulp.dest(destfiles))
        .pipe(myProm.deliverGulpPromise(`assets___${dirs[i]}`));

      gulp
        .src(path.join(srcpath, dirs[i], "/html/**/*.*"))
        .pipe(
          htmlmin({
            // safely remove whitespace
            collapseWhitespace: true,
            conservativeCollapse: true,

            // remove any comments
            removeComments: true,

            // sort attributes and class names so the files gzip better
            sortAttributes: true,
            sortClassName: true,
          })
        )
        .pipe(compileTemplate())
        .pipe(gulp.dest(destfiles))
        .pipe(myProm.deliverGulpPromise(`html___${dirs[i]}`));
    }
  }
}

/**
 * Compiles templates into pure javascript to avoid the need to eval on
 * the client. Also runs the compiled javascript through a minifier to
 * try to keep the size to a minimum as the templating engine doesn't
 * produce optimal code. The result is wrapped in an AMD wrapper.
 */
function compileTemplate() {
  function compile(file, enc, callback) {
    const text = file.contents.toString("utf8");

    const preamble = `_fsDefine(["exports"], function(exports) {exports = `;
    const postamble = `;return exports;})`;

    const source = `${preamble}${template(text).source}${postamble}`;

    const minified = minify(source, { mangle: { eval: true }, compress: true });

    if (minified.error) {
      return callback(minified.error);
    }

    const dirname = path.dirname(file.path);
    const basename = path.basename(file.path).replace(/\.html$/i, "___html.js");
    const newpath = path.join(dirname, basename);

    const buff = Buffer.from(minified.code, "utf8");
    file.contents = buff;
    file.path = newpath;

    return callback(null, file);
  }

  return through.obj(compile);
}

module.exports = { buildTemplates, buildCustomTemplates };
