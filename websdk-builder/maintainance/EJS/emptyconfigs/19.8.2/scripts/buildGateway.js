const concat = require("gulp-concat");
const dateFormat = require("dateformat");
const fs = require("fs");
const path = require("path");
const gulp = require("gulp");
const chalk = require("chalk");
const jshint = require("gulp-jshint");
const pragma = require("gulp-pragma");
const prettify = require("gulp-jsbeautifier");
const replace = require("gulp-replace");
const stylish = require("jshint-stylish");
const uglify = require("gulp-uglify");
const wrap = require("gulp-wrap");

function buildGateway(isProd, pjson) {
  let paths = {
    dest: path.join(pjson.build.extern, "/gateway/tags/", pjson.gateway_version, "/dist"),
    gatewaysrc: path.join(
      pjson.build.extern,
      "/gateway/tags/",
      pjson.gateway_version,
      "/src/gateway/**/*.js"
    ),
    configsrc: path.join(
      pjson.build.extern,
      "/gateway/tags/",
      pjson.gateway_version,
      "/src/config/**/*.js"
    ),
    test: path.join(pjson.build.extern, "/gateway/tags/", pjson.gateway_version, "/testharness/"),
    legal: path.join(
      pjson.build.extern,
      "/gateway/tags/",
      pjson.gateway_version,
      "/bin/legalheader.txt"
    ),
  };

  // if (!fs.existsSync(path.join(paths.dest, "gateway" + (isProd ? ".min" : "") + ".js"))) {
  let forceDebug = !isProd,
    defaultCodeVer = pjson.version;

  console.log(
    chalk.grey("Building gateway"),
    chalk.yellow(pjson.gateway_version.toString()),
    chalk.grey("with a default code version of"),
    chalk.yellow(defaultCodeVer.toString()),
    chalk.grey(".\n"),
    chalk.grey("↳", path.resolve(paths.dest))
  );

  /**
   * Get the legal text
   * @returns {*}
   */
  function getLegal() {
    var legal = fs.readFileSync(paths.legal).toString();
    legal = legal.replace(
      /\[\$DATE\]/gi,
      dateFormat(Date.now(), "dddd, mmmm dS, yyyy, h:MM:ss TT")
    );
    legal = legal.replace(/\[\$VER\]/gi, pjson.gateway_version);
    return '"use strict";\n' + legal;
  }

  gulp
    .src(paths.configsrc)
    .pipe(
      jshint({
        /*
         * suppress warnings about dot notation
         */
        sub: true,
        laxbreak: true,
      })
    )
    .pipe(jshint.reporter(stylish))
    .pipe(concat("gatewayconfig.js"))
    .pipe(
      pragma({
        debug: forceDebug || false,
      })
    )
    .pipe(replace(/\$\{defaultCodeVer\}/g, pjson.gateway_version))
    .pipe(wrap(getLegal() + "\n;(function(){\n<%= contents %>\n})();"))
    .pipe(
      prettify({
        indentSize: 2,
      })
    )
    .pipe(gulp.dest(paths.dest));

  gulp
    .src(paths.configsrc)
    .pipe(
      jshint({
        /*
         * suppress warnings about dot notation
         */
        sub: true,
        laxbreak: true,
      })
    )
    .pipe(jshint.reporter(stylish))
    .pipe(concat("gatewayconfig.min.js"))
    .pipe(
      pragma({
        debug: forceDebug || false,
      })
    )
    .pipe(replace(/\$\{defaultCodeVer\}/g, pjson.gateway_version))
    .pipe(wrap(getLegal() + "\n<%= contents %>"))
    .pipe(gulp.dest(paths.dest));

  gulp
    .src(paths.gatewaysrc)
    .pipe(
      jshint({
        /*
         * suppress warnings about dot notation
         */
        sub: true,
        laxbreak: true,
      })
    )
    .pipe(jshint.reporter(stylish))
    .pipe(concat("gateway.js"))
    .pipe(
      pragma({
        debug: forceDebug || false,
      })
    )
    .pipe(replace(/\$\{defaultCodeVer\}/g, defaultCodeVer))
    .pipe(wrap(getLegal() + "\n;(function(){\n<%= contents %>\n})();"))
    .pipe(
      prettify({
        indentSize: 2,
      })
    )
    .pipe(gulp.dest(paths.dest));

  if (forceDebug) {
    return gulp
      .src(paths.gatewaysrc)
      .pipe(
        jshint({
          //suppress warnings about dot notation
          sub: true,
          laxbreak: true,
        })
      )
      .pipe(jshint.reporter(stylish))
      .pipe(concat("gateway.min.js"))
      .pipe(
        pragma({
          debug: true,
        })
      )
      .pipe(replace(/\$\{defaultCodeVer\}/g, defaultCodeVer))
      .pipe(wrap(getLegal() + "\n;(function(){\n<%= contents %>\n})();"))
      .pipe(
        prettify({
          indentSize: 2,
        })
      )
      .pipe(gulp.dest(paths.dest));
  } else {
    return gulp
      .src(paths.gatewaysrc)
      .pipe(concat("gateway.min.js"))
      .pipe(
        pragma({
          debug: forceDebug || false,
        })
      )
      .pipe(replace(/\$\{defaultCodeVer\}/g, defaultCodeVer))
      .pipe(wrap("(function(){\n<%= contents %>\n})();"))
      .pipe(
        uglify({
          mangle: false,
          output: {
            comments: "some",
          },
          compress: {
            dead_code: false,
          },
        })
      )
      .on("error", function(err) {
        console.error(chalk.red(err.toString()));
      })
      .pipe(wrap(getLegal() + "\n<%= contents %>"))
      .pipe(gulp.dest(paths.dest));
  }
  // } else {
  //   console.log(chalk.yellow("Building gateway not necessary."));
  //   process.nextTick(cb);
  // }
}

module.exports = { buildGateway };
