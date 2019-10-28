/* eslint-env node */

const exclude = require("gulp-ignore").exclude;
const fs = require("fs");
const greplace = require("gulp-replace");
const gulp = require("gulp");
const gulpif = require("gulp-if");
const minifyHTML = require("gulp-htmlmin");
const promise = require("gulp-promise");
const rimraf = require("rimraf");
const wrap = require("gulp-wrap");

function buildHTML(isProd, pjson) {
  const logoimg = fs.readFileSync("./assets/p_b_foresee.svg").toString();
  return gulp
    .src(["./assets/**/*.html"])
    .pipe(greplace(/\{logodatauri\}/gi, logoimg))
    .pipe(gulpif(isProd, minifyHTML(), wrap("<%= contents %>")))
    .pipe(gulp.dest(`${pjson.build.dist}/code/${pjson.version}/`));
}

function buildImages(pjson) {
  return gulp
    .src([
      "./assets/**/*.png",
      "./assets/**/*.gif",
      "./assets/**/*.jpg",
      "./assets/**/*.svg",
      "./assets/**/*.json",
      "./assets/**/*.ico",
    ])
    .pipe(gulp.dest(`${pjson.build.dist}/code/${pjson.version}/`));
}

function buildClientAssets(pjson, clientProperties, cb) {
  const productsListCopy = clientProperties.client.productsToBuild.slice(0);

  // Finish building and copying files
  function finishBuildingFolders() {
    const dirProm = new promise();

    dirProm.makePromises(productsListCopy.slice(0), function() {
      for (let p = 0; p < productsListCopy.length; p++) {
        const productBeingBuilt = productsListCopy[p];
        gulp
          .src([`${pjson.build.config}/productconfig/${productBeingBuilt}/assets/**/*.*`])
          .pipe(exclude(".gitkeep"))
          .pipe(gulp.dest(`${pjson.build.dist}/${productBeingBuilt}`));
      }

      if (cb) return cb();
    });

    for (let i = 0; i < productsListCopy.length; i++) {
      const productBeingBuilt = productsListCopy[i];
      fs.mkdir(
        `${pjson.build.dist}/${productBeingBuilt}`,
        (function(prod) {
          return function() {
            dirProm.deliverPromise(prod);
          };
        })(productBeingBuilt)
      );
    }
  }

  const initialDirProm = new promise();
  initialDirProm.makePromises(productsListCopy.slice(0), finishBuildingFolders);

  for (let i = 0; i < productsListCopy.length; i++) {
    const productBeingBuilt = productsListCopy[i];
    if (fs.existsSync(`${pjson.build.dist}/${productBeingBuilt}`)) {
      rimraf(
        `${pjson.build.dist}/${productBeingBuilt}`,
        (function(prod) {
          return function() {
            initialDirProm.deliverPromise(prod);
          };
        })(productBeingBuilt)
      );
    } else {
      process.nextTick(
        (function(prod) {
          return function() {
            initialDirProm.deliverPromise(prod);
          };
        })(productBeingBuilt)
      );
    }
  }
}

module.exports = { buildHTML, buildImages, buildClientAssets };
