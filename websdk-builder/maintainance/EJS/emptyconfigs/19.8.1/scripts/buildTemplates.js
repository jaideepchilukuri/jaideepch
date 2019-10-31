const bityProm = require("bity-promise");
const cssmin = require("gulp-cssmin");
const fs = require("fs");
const path = require("path");
const promise = require("gulp-promise");
const gulp = require("gulp");
const gulpjsonp = require("gulp-jsonp");
const sass = require("gulp-sass");

const fsGulpUtil = require("../bin/fsgulputils");

function buildTemplates(pjson, cb) {
  let templateProducts = fsGulpUtil.getDirectories("./templates/").filter(t => t !== "custom");

  let rootSrcPath = "templates/";

  let getDestinationFilePath = (product, dir) =>
    path.join(pjson.build.dist, "/code/", pjson.code_version, "/templates/", product, "/", dir);

  return build(templateProducts, rootSrcPath, getDestinationFilePath, cb);
}

function buildCustomTemplates(pjson, cb) {
  let templateProducts = fsGulpUtil.getDirectories("./templates/custom/");

  let rootSrcPath = "templates/custom/";

  let getDestinationFilePath = (product, dir) =>
    path.join(pjson.build.dist, "/", product, "/templates/", dir);

  return build(templateProducts, rootSrcPath, getDestinationFilePath, cb);
}

function build(templateProducts, rootSrcPath, getDestinationFilePath, cb) {
  var templateProm = new bityProm(
    () => {
      cb ? cb() : function noop() {};
    },
    function promFail() {
      throw new Error("Failed building the templates.");
    },
    10000
  );
  templateProm.make(templateProducts);

  // Loop through each subfolder, and build the templates inside
  for (let p = 0; p < templateProducts.length; p++) {
    var srcpath = path.join(rootSrcPath, templateProducts[p], "/");
    var dirs = fs.readdirSync(srcpath).filter(function(file) {
      return fs.statSync(path.join(srcpath, file)).isDirectory();
    });
    var promiselist = [];
    var myProm = new promise();

    if (dirs.length == 0) {
      templateProm.resolve(templateProducts[p]);
    }

    for (let i = 0; i < dirs.length; i++) {
      promiselist.push("sass___" + dirs[i]);
      promiselist.push("img___" + dirs[i]);
      promiselist.push("font___" + dirs[i]);
      promiselist.push("assets___" + dirs[i]);
      promiselist.push("html___" + dirs[i]);
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
      var destfiles = getDestinationFilePath(templateProducts[p], dirs[i]);

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
        .pipe(myProm.deliverGulpPromise("sass___" + dirs[i]));

      gulp
        .src(path.join(srcpath, dirs[i], "/images/**/*.*"))
        .pipe(gulp.dest(destfiles))
        .pipe(myProm.deliverGulpPromise("img___" + dirs[i]));

      gulp
        .src(path.join(srcpath, dirs[i], "/fonts/**/*.*"))
        .pipe(gulp.dest(destfiles))
        .pipe(myProm.deliverGulpPromise("font___" + dirs[i]));

      gulp
        .src(path.join(srcpath, dirs[i], "/assets/**/*.*"))
        .pipe(gulp.dest(destfiles))
        .pipe(myProm.deliverGulpPromise("assets___" + dirs[i]));

      gulp
        .src(path.join(srcpath, dirs[i], "/html/**/*.*"))
        .pipe(
          gulpjsonp({
            callback: "__fsJSONPCB",
            key: ("templates/" + templateProducts[p] + "/" + dirs[i] + "/").split("/").join("_"),
          })
        )
        .pipe(gulp.dest(destfiles))
        .pipe(myProm.deliverGulpPromise("html___" + dirs[i]));
    }
  }
}

module.exports = { buildTemplates, buildCustomTemplates };
