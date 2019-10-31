var gulp = require('gulp'),
  concat = require('gulp-concat'),
  wrap = require('gulp-wrap'),
  colors = require('colors'),
  prettify = require('gulp-jsbeautifier'),
  fs = require("fs"),
  dateFormat = require('dateformat'),
  rimraf = require('rimraf'),
  mkdirp = require('mkdirp'),
  uglify = require('gulp-uglify'),
  SymbolMusher = require("./utils/symbolsmusher"),
  jshint = require('gulp-jshint'),
  stylish = require('jshint-stylish'),
  pJSON = require('./package.json'),
  handydevserver = require('handydevserver'),
  fsGulpUtil = require('./utils/fsgulputils'),
  pragma = require('gulp-pragma'),
  munge = require('filemunge'),
  FcpClient = require('fcp-client'),
  gutil = require('gulp-util'),
  replace = require('gulp-replace');

/**
* Should we strip all pragma tags?
*/
var stripAllPragma = (gutil.env._[0] || '').toLowerCase().indexOf('publish') > -1,
  // Force debug mode
  forceDebug = false,
  testEnvs;
if (!stripAllPragma) {
  stripAllPragma = (gutil.env._[0] || '').toLowerCase().indexOf('reset') > -1;
}

try {
  var taskName = gutil.env._[0].toLowerCase();
  // If a "production" task is run.....
  if (taskName.indexOf('debug') > -1) {
    forceDebug = true;
  }
} catch (e) {
}
if (taskName.indexOf('_test_envs') > -1) {
  testEnvs = true;
}

/**
* Src files
*/
var paths = {
  gatewaysrc: 'src/gateway/**/*.js',
  configsrc: 'src/config/**/*.js',
  dest: 'dist/',
  test: 'testharness/',
  legal: 'bin/legalheader.txt'
};

/**
* Get the legal text
* @returns {*}
*/
function getLegal() {
  var legal = fs.readFileSync(paths.legal).toString();
  legal = legal.replace(/\[\$DATE\]/gi, dateFormat(Date.now(), "dddd, mmmm dS, yyyy, h:MM:ss TT"));
  legal = legal.replace(/\[\$VER\]/gi, pJSON.version);
  return "\"use strict\";\n" + legal;
}

/**
* Clean up destination folders
*/
gulp.task('clean', [], function (cb) {
  rimraf(paths.dest, function () {
    mkdirp(paths.dest, cb);
  });
});

/**
* Just build the debug code
*/
gulp.task('code', ['clean'], function (cb) {
  var defaultCodeVer = pJSON.defaultCodeVer;

  if (!forceDebug) {
    console.log("***********************************************************".magenta);
    console.log("*******".magenta + " PROD CODE".yellow + "        **********************************".magenta);
    console.log("***********************************************************".magenta);
  } else {
    console.log("***********************************************************".magenta);
    console.log("*******".magenta + " DEBUG CODE".gray + "         ********************************".magenta);
    console.log("***********************************************************".magenta);
  }

  console.log("Building with a default code version of ".grey + defaultCodeVer.toString().yellow + ".".grey);

  gulp.src(paths.configsrc)
    .pipe(jshint({
      /*
       * suppress warnings about dot notation
       */
      sub: true
    }))
    .pipe(jshint.reporter(stylish))
    .pipe(concat("gatewayconfig.js"))
    .pipe(pragma({
      debug: forceDebug || false
    }))
    .pipe(replace(/\$\{defaultCodeVer\}/g, defaultCodeVer))
    .pipe(wrap(getLegal() + '\n;(function(){\n<%= contents %>\n})();'))
    .pipe(prettify({ indentSize: 2 }))
    .pipe(gulp.dest(paths.dest));
  gulp.src(paths.configsrc)
    .pipe(jshint({
      /*
       * suppress warnings about dot notation
       */
      sub: true
    }))
    .pipe(jshint.reporter(stylish))
    .pipe(concat("gatewayconfig.min.js"))
    .pipe(pragma({
      debug: forceDebug || false
    }))
    .pipe(replace(/\$\{defaultCodeVer\}/g, defaultCodeVer))
    .pipe(wrap(getLegal() + '\n<%= contents %>'))
    .pipe(gulp.dest(paths.dest));

  if (stripAllPragma) {
    gulp.src(paths.gatewaysrc)
      .pipe(jshint({
        /*
         * suppress warnings about dot notation
         */
        sub: true
      }))
      .pipe(jshint.reporter(stylish))
      .pipe(concat("gateway.js"))
      .pipe(pragma({
        debug: forceDebug || false
      }))
      .pipe(replace(/\$\{defaultCodeVer\}/g, defaultCodeVer))
      .pipe(wrap(getLegal() + '\n;(function(){\n<%= contents %>\n})();'))
      .pipe(prettify({ indentSize: 2 }))
      .pipe(gulp.dest(paths.dest));
  } else {
    gulp.src(paths.gatewaysrc)
      .pipe(jshint({
        /*
         * suppress warnings about dot notation
         */
        sub: true
      }))
      .pipe(jshint.reporter(stylish))
      .pipe(concat("gateway.js"))
      .pipe(pragma({
        debug: true
      }))
      .pipe(replace(/\$\{defaultCodeVer\}/g, defaultCodeVer))
      .pipe(wrap(getLegal() + '\n;(function(){\n<%= contents %>\n})();'))
      .pipe(prettify({ indentSize: 2 }))
      .pipe(gulp.dest(paths.dest));
  }
  if (forceDebug) {
    return gulp.src(paths.gatewaysrc)
      .pipe(jshint({
        /*
         * suppress warnings about dot notation
         */
        sub: true
      }))
      .pipe(jshint.reporter(stylish))
      .pipe(concat("gateway.min.js"))
      .pipe(pragma({
        debug: true
      }))
      .pipe(replace(/\$\{defaultCodeVer\}/g, defaultCodeVer))
      .pipe(wrap(getLegal() + '\n;(function(){\n<%= contents %>\n})();'))
      .pipe(prettify({ indentSize: 2 }))
      .pipe(gulp.dest(paths.dest));
  } else {
    return gulp.src(paths.gatewaysrc)
      .pipe(concat("gateway.min.js"))
      .pipe(pragma({
        debug: forceDebug || false
      }))
      .pipe(replace(/\$\{defaultCodeVer\}/g, defaultCodeVer))
      .pipe(wrap('(function(){\n<%= contents %>\n})();'))
      .pipe(uglify({
        mangle: false,
        preserveComments: 'some',
        compress: {
          dead_code: false
        }
      }))
      .pipe(wrap(getLegal() + '\n<%= contents %>'))
      .pipe(gulp.dest(paths.dest));
  }
});

/**
* Run dev server
*/
gulp.task('dev', ['code'], function (cb) {
  // Pull the configs in
  var globalConfig = 'globalConfig = ' + fs.readFileSync('./' + paths.test + 'sample_global_config.json').toString() + ';',
    configfiles = new munge('./' + paths.test),
    configObject = "";

  configfiles.iterateSync(function (filename, contents) {
    if (filename.indexOf('.js') > -1 && filename.indexOf('sample_product_config') > -1) {
      var productName = filename.replace('sample_product_config_', '').replace('.js', '');
      configObject += "productConfig." + productName + " = " + contents.toString() + ";\n\n";
    }
  });

  // Handles text file requests
  var textfilehandler = function (filename, contents, headers) {
    if (filename.indexOf('.htm') > -1 || filename.indexOf('.html') > -1) {
      // IE privacy policy. Needed for IE8.
      headers.P3P = 'CP="CURa ADMa DEVa CONo HISa OUR IND DSP ALL COR"';
    } else if (filename.toLowerCase().indexOf('.js') > -1) {
      contents = contents.replace(/\/[^\/\[]*\[GENERAL_CONFIG\][^\/]*\//gi, globalConfig + configObject);
      contents = contents.replace(/\$\{staticCodeLocation\}/gi, "/static/");
      contents = contents.replace(/\$\{versionTag\}/gi, pJSON.version);
    }
    return contents;
  };

  var testfolders = [paths.dest, './' + paths.test + 'testpages', './' + paths.test + 'statictest'],
    ignorelist = ['DS_Store', '_selfhost_', 'embed.txt', '.zip', '.gitkeep'];

  // Start an SSL server
  var startServerSSL = function () {
    handydevserver(
      443,
      testfolders,
      {
        ssl: true,
        ignore: ignorelist,
        latency: 0,
        ontextfile: textfilehandler
      });
    fsGulpUtil.signal('SSL Server Started', 'Build complete. Web server running at https://localhost...');
  };

  // Start a non-SSL server
  var startServer = function () {
    handydevserver(
      80,
      testfolders,
      {
        ssl: false,
        ignore: ignorelist,
        latency: 0,
        ontextfile: textfilehandler
      });
    setTimeout(function () {
      fsGulpUtil.signal('Server Started', 'Build complete. A web server running at http://localhost...');
    }, 500);
  };

  startServer();
  startServerSSL();

  if (cb) {
    cb();
  }
});

/**
* Actually do the publish
* @param cb
* @constructor
*/
var DoPublish = function (u, p, env, notes, cb) {

  // Read the files
  var uniminfiedGW = fs.readFileSync('./' + paths.dest + 'gateway.js').toString(),
    minifiedGW = fs.readFileSync('./' + paths.dest + 'gateway.min.js').toString(),
    uniminfiedCFG = fs.readFileSync('./' + paths.dest + 'gatewayconfig.js').toString(),
    minifiedCFG = fs.readFileSync('./' + paths.dest + 'gatewayconfig.min.js').toString(),
    didPostGW = false,
    didPostCFG = false;

  // Fix the ${staticCodeLocation}
  var staticLocation = "../../../code/",
    defaultCodeVer = pJSON.defaultCodeVer;
  uniminfiedGW = uniminfiedGW.replace(/\$\{staticCodeLocation\}/gi, staticLocation);
  minifiedGW = minifiedGW.replace(/\$\{staticCodeLocation\}/gi, staticLocation);
  uniminfiedCFG = uniminfiedCFG.replace(/\$\{staticCodeLocation\}/gi, staticLocation);
  minifiedCFG = minifiedCFG.replace(/\$\{staticCodeLocation\}/gi, staticLocation);

  // SHOULD NOT DO THIS
  /*uniminfiedGW = uniminfiedGW.replace(/\$\{versionTag\}/gi, defaultCodeVer);
   minifiedGW = minifiedGW.replace(/\$\{versionTag\}/gi, defaultCodeVer);
   uniminfiedCFG = uniminfiedCFG.replace(/\$\{versionTag\}/gi, defaultCodeVer);
   minifiedCFG = minifiedCFG.replace(/\$\{versionTag\}/gi, defaultCodeVer);*/

  let re = new RegExp(/.*(dev|qa2|qa|stg).*/i),
    completeCounter = 0,
    envMatch;
  /**
   * Checks to see if we're done
   */
  var check = function () {
    if (didPostGW && didPostCFG) {
      if (cb) {
        cb();
      }
    } else if (completeCounter == 2) {
      // failed on that env
    }
  };

  /**
   * Set up an instance of the FCP client
   * @type {FCPClient}
   */
  var fcp = new FcpClient(u, p, env);
  fcp.postGatewayFiles(uniminfiedGW, minifiedGW, notes, function (success) {
    envMatch = env.match(re)[1];
    if (!success) {
      console.log("Failed to Post Gateway file on".red, envMatch);
    } else {
      console.log("Posted Gateway file on".yellow, envMatch);
      didPostGW = true;
      check();
    }
    completeCounter += 1;
  });
  fcp.postConfigFiles(uniminfiedCFG, minifiedCFG, notes, function (success) {
    envMatch = env.match(re)[1];
    if (!success) {
      console.log("Failed to Post Config file on".red, envMatch)
    } else {
      console.log("Posted Config file on".yellow, envMatch);
      didPostCFG = true;
      check();
    }
    completeCounter += 1;
  });
};
/**
* Publish Gateway to dev/qa/qa2/stg FCP environments
*/
gulp.task("publish_test_envs", ["publish"]);

/**
* Publish Gateway to FCP
*/
gulp.task("publish", ['code'], function (cb) {
  FcpClient.promptForFCPCredentials({
    notes: true,
    disableEnv: !!testEnvs
  }, function (rs) {
    if (testEnvs) {
      let fe = FcpClient.environments;
      let fes = FcpClient.environmentShort;

      for (var i = 0; i <= 3; i++) {
        DoPublish(rs.username, rs.password, fe[fes[i]], rs.notes);
      }
    } else {
      DoPublish(rs.username, rs.password, rs.environment, rs.notes);
    }
    cb && cb();
  });
});

/**
* Push code to FCP (DEBUG VERSION)
*/
gulp.task("publish_debug", ['publish'], function (cb) {
  if (cb) {
    cb();
  }
});

/**
* RESET then push code to FCP
*/
gulp.task("reset", ['code'], function (cb) {
  FcpClient.promptForFCPCredentials({}, function (rs) {
    var fcp = new FcpClient(rs.username, rs.password, rs.environment);
    console.log("Resetting environment " + rs.environment + "...");
    fcp.reset(function () {
      console.log("Reset complete.. waiting 10 seconds..");
      setTimeout(function () {
        DoPublish(rs.username, rs.password, rs.environment, "Initial version", function () {
          if (cb) {
            cb();
          }
        });
      }, 10000);
    });
  });
});

// The default task is everything
gulp.task('default', ['code']);
