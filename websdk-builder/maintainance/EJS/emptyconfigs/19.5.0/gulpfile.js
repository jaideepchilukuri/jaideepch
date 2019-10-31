/**
 * Build file for client code.
 */
var pjson = require('./package.json'),
  clientProperties = require('./clientconfig/client_properties'),
  svcmp = require('semver-compare'),
  clrs = require('colors'),
  fsGulpUtil = require('./bin/fsgulputils'),
  Upgrader = require('./bin/templateupgrader'),
  semver = require('semver'),
  mv = require('mv'),
  ncp = require('ncp').ncp,
  async = require('async'),
  skipPublishingFeedbackConfig = true,
  mailer = require('nodemailer'),
  smtpTransport = require('nodemailer-smtp-transport'),
  emailValidator = require('email-validator');
  

// Fix the missing events URL if applicable
if (!clientProperties.client.events) {
  clientProperties.client.events = 'https://analytics.foresee.com/ingest/events';
}

// Insist on a minimum version of node
var _evner = process.version.toString().replace(/[v><=]/gi, ''),
  _mpver = pjson.engines.node.toString().replace(/[v><=]/gi, ''),
  resk = svcmp(_evner, _mpver);

if (!skipPublishingFeedbackConfig) {
  console.log("Warning: ".red + " Feedback is eligible for publishing. Turn off before committing.".yellow);
}

if (resk == -1) {
  console.log("\n**************************************************************".grey);
  console.log("A minimum Node version of ".magenta + "v".yellow + _mpver.toString().yellow + " is required (your version: ".magenta + "v".yellow + _evner.toString().yellow + "). Please get the latest from ".magenta + "http://nodejs.org".yellow + ".".magenta);
  console.log("**************************************************************\n".grey);
  return;
}

// Signals what version we are running
console.log("Client Code Template ".magenta + "v".yellow + pjson.version.toString().yellow + ". Code ".magenta + "v".yellow + pjson.code_version.toString().yellow + ".".magenta + " Node ".magenta + process.version.toString().yellow + ".".magenta + " **********************".grey);

var gulp = require('gulp'),
  archiver = require('archiver'),
  argv = require('yargs').argv,
  beautify = require('js-beautify').js_beautify,
  bufferize = require('gulp-bufferize'),
  concat = require('gulp-concat'),
  copydir = require('copy-dir'),
  cssmin = require('gulp-cssmin'),
  exclude = require('gulp-ignore').exclude,
  extend = require('extend'),
  FcpClient = require('fcp-client'),
  fs = require('fs'),
  gcallback = require('gulp-callback'),
  gitsync = require('node-gitsync'),
  greplace = require('gulp-replace'),
  gulpif = require('gulp-if'),
  gulpjsonp = require('gulp-jsonp'),
  gutil = require('gulp-util'),
  handydevserver = require('handydevserver'),
  header = require('gulp-header'),
  http = require('http'),
  jshint = require('gulp-jshint'),
  jsmodule = require('gulp-jsmodule'),
  lotemplate = require('lodash.template'),
  minifyHTML = require('gulp-htmlmin'),
  path = require('path'),
  pragma = require('gulp-pragma'),
  prettify = require('gulp-jsbeautifier'),
  promise = require('gulp-promise'),
  prompt = require('prompt'),
  restler = require('restler'),
  rimraf = require('rimraf'),
  runSequence = require('run-sequence'),
  sass = require('gulp-sass'),
  stream = require('stream'),
  strftime = require('strftime'),
  stylish = require('jshint-stylish'),
  template = require('gulp-template'),
  uglify = require('gulp-uglify'),
  util = require('util'),
  bityProm = require('bity-promise'),
  wrap = require('gulp-wrappy'),
  uuidV4 = require('uuid'),
  zipdir = require('zip-dir');

// Set some defaults about what mode we are in
var isProd = false,
  isSSL = true,
  creds = {},
  testEnvs,
  envVariableOptions = fsGulpUtil.readEnvVariables();

try {
  var taskName = gutil.env._[0].toLowerCase();
  // If a "production" task is run.....
  if (taskName.indexOf('prod') > -1) {
    isProd = true;
    // QA's automated scripts don't have sudo access
    isSSL = false;
  }
  /*if (taskName.indexOf('preview') > -1) {
   isProd = false;
   }*/
  if (taskName.indexOf('push_') > -1) {
    isProd = true;
  }
  // If a "debug" task is run.....
  if (taskName.indexOf('debug') > -1) {
    isProd = false;
  }
  // Self hosted is prod
  if (taskName.indexOf('get_self_hosted') > -1) {
    isProd = true;
  }
  // If it's not a prod task
  if (taskName.indexOf('prod') === -1) {
    var transportUrl = clientProperties.client.transporturl;
    // If it's QA..
    if (transportUrl.indexOf('qa-rec.') === -1 && taskName.indexOf('qa') > -1) {
      clientProperties.client.transporturl = transportUrl.replace(/\/rec\./i, '/qa-rec.');
    }
  }
  if (taskName.indexOf('_test_envs') > -1) {
    testEnvs = true;
  }
} catch (e) {
}

/**
 * Uglify settings
 * @type {{preserveComments: string}}
 */
var uglifySetts = {
  mangle: {
    except: ['config']
  },
  preserveComments: function (node, comment) {
    if (comment.value.indexOf('@preserve') > -1 || comment.value.indexOf('@license') > -1) {
      return true;
    }
    return false;
  }
};

/**
 * Prettify settings
 * @type {{indentSize: number}}
 */
var prettifySetts = {
  "indentSize": 2
};

/**
 * The list of projects to build. The project symbol in the list represents the folder
 * it's in (eg: "invite" gets found in /invite in the src dir). The name is written into
 * the top of the file, and the deps are the requireJS dependencies that get imported.
 * If you set skipAMD: true then the file will NOT be wrapped in any AMD junk.
 */
var projectsToBuild = {
  "utils": {name: "Utils Library"},
  "survey": {name: "Survey", deps: ["$fs.utils.js"]},
  "feedback": {name: "Feedback", deps: ["$fs.utils.js", "$fs.survey.js", {'feedbackconfig': 'config'}]},
  "feedbackreport": {name: "Feedback Reporting UI", deps: ["$fs.utils.js", {'feedbackconfig': 'config'}]},
  "feedbacksurvey": {
    name: "Feedback Standalone Survey",
    deps: ["$fs.utils.js", "$fs.survey.js"]
  },
  "frame": {name: "Storage Frame", deps: ["fs.utils.js"]},
  "record": {name: "record", deps: ["$fs.utils.js", {'recordconfig': 'recordconfig'}]},
  "invite": {name: "Invitation Presenter Plugin", deps: ["$fs.utils.js", {'triggerconfig': 'config'}]},
  "trueconversion": {name: "True Conversion Plugin", deps: ["$fs.utils.js", {'triggerconfig': 'config'}]},
  "optout": {name: "Opt-Out Module", deps: ["$fs.utils.js", {'triggerconfig': 'config'}]},
  "svadmin": {name: "Survey Admin Module", deps: ["$fs.utils.js", {'triggerconfig': 'config'}]},
  "tracker": {name: "Tracker Window", deps: ["fs.utils.js"]},
  "trigger": {name: "Trigger", deps: ["$fs.utils.js", {'triggerconfig': 'config'}]},
  "storageupgrade": {name: "Storage Upgrade", deps: ["$fs.utils.js"]}
};

/**
 * Generates a text header for JavaScript files
 */
function getBuildHeader(projectName, props) {
  return "/***************************************\n* @preserve\n* ForeSee Web SDK: " + projectName + "\n* Built " + strftime('%B %d, %y %H:%M:%S') +
    "\n* Code version: " + pjson.code_version.toString() +
    "\n* Template version: " + pjson.version + "\n***************************************/\n\n";
}

/**
 * Delete any files in the dist folder
 */
gulp.task('_cleandist', function (cb) {
  rimraf(pjson.build.dist + '/*', cb);
});

/**
 * Delete any retrieved externals
 */
gulp.task('cleanextern', function (cb) {
  rimraf(pjson.build.extern + '/clientcode/tags/*', function () {
    rimraf(pjson.build.extern + '/clientcode/branches/*', function () {
      rimraf(pjson.build.extern + '/clientcode/trunk/*', function () {
        rimraf(pjson.build.extern + '/gateway/tags/*', function () {
          rimraf(pjson.build.extern + '/gateway/branches/*', function () {
            rimraf(pjson.build.extern + '/gateway/trunk/*', function () {
              if (cb) {
                cb();
              }
            });
          });
        });
      });
    });
  });
});

/**
 * Go get external libraries
 */
gulp.task('_pullextern', function (cb) {
  process.nextTick(function () {
    // First grab the gateway code
    gitsync({
      'dest': pjson.build.extern + '/gateway/tags/',
      'repo': pjson.repository.url + '/gateway_js.git',
      'branch': pjson.gateway_version
    }, function (err) {
      if (err) {
        console.log("Error getting gateway code!", err);
        return;
      }
      // Now go get the client code
      gitsync({
        'dest': pjson.build.extern + '/clientcode/tags/',
        'repo': pjson.repository.url + '/client_code.git',
        'branch': pjson.code_version
      }, function (err) {
        if (err) {
          console.log("Error getting client code!", err);
          return;
        }
        if (cb) {
          cb();
        }
      });
    });
  });
});

/**
 * Copy HTML assets
 */
gulp.task('_html', function () {
  var logoimg = fs.readFileSync('./assets/p_b_foresee.svg').toString();
  gulp.src(['./assets/**/*.html'])
    .pipe(greplace(/\{logodatauri\}/gi, logoimg))
    .pipe(gulpif(isProd, minifyHTML(), wrap('<%= contents %>')))
    .pipe(gulp.dest(pjson.build.dist + '/code/' + pjson.code_version + '/'))
});

/**
 * Copy Image assets
 */
gulp.task('_images', function () {
  gulp.src(['./assets/**/*.png', './assets/**/*.gif', './assets/**/*.jpg', './assets/**/*.svg', './assets/**/*.json', './assets/**/*.ico'])
    .pipe(gulp.dest(pjson.build.dist + '/code/' + pjson.code_version + '/'));
});

/**
 * Copy client assets
 */
gulp.task('_clientassets', function () {
  var productsListCopy = clientProperties.client.productsToBuild.slice(0);

  // Finish building and copying files
  function finishBuildingFolders() {
    var dirProm = new promise();
    dirProm.makePromises(productsListCopy.slice(0), function () {
      for (var p = 0; p < productsListCopy.length; p++) {
        var productBeingBuilt = productsListCopy[p];
        gulp.src([pjson.build.config + '/productconfig/' + productBeingBuilt + '/assets/**/*.*'])
          .pipe(exclude('.gitkeep'))
          .pipe(gulp.dest(pjson.build.dist + '/' + productBeingBuilt));
      }
    });
    for (var i = 0; i < productsListCopy.length; i++) {
      var productBeingBuilt = productsListCopy[i];
      fs.mkdir(pjson.build.dist + '/' + productBeingBuilt, function (prod) {
        return function () {
          dirProm.deliverPromise(prod);
        };
      }(productBeingBuilt));
    }
  }

  var initialDirProm = new promise();
  initialDirProm.makePromises(productsListCopy.slice(0), finishBuildingFolders);

  for (var i = 0; i < productsListCopy.length; i++) {
    var productBeingBuilt = productsListCopy[i];
    if (fs.existsSync(pjson.build.dist + '/' + productBeingBuilt)) {
      rimraf(pjson.build.dist + '/' + productBeingBuilt, function (prod) {
        return function () {
          initialDirProm.deliverPromise(prod);
        };
      }(productBeingBuilt));
    } else {
      process.nextTick(function (prod) {
        return function () {
          initialDirProm.deliverPromise(prod);
        };
      }(productBeingBuilt));
    }
  }

});

/**
 * Delete node_modules
 */
gulp.task('_clean_modules', function (cb) {
  rimraf('./node_modules', cb);
});

/**
 * Build a JS project. Pass in a project object and a callback OR a promise
 * @param proj - Project Object
 * @param cb - Callback or promise
 */
var buildJSProject = function (codever, distloc, proj, projInfo, topdeps, writefile, cb) {
  var externprefix = './extern',
    hasdeps = false,
    dpcount = 0,
    amdWrap = "_fsDefine([",
    p;

  for (var dp in topdeps) {
    if (dpcount > 0) {
      amdWrap += ', ';
    }
    amdWrap += '\'' + dp + '\'';
    dpcount++;
  }

  if (projInfo.deps && projInfo.deps.length > 0) {
    for (p = 0; p < projInfo.deps.length; p++) {
      if (typeof projInfo.deps[p] == 'string' && projInfo.deps[p].indexOf('.') > -1 && projInfo.deps[p].indexOf('^') == -1) {
        var depfname = projInfo.deps[p];
        amdWrap += ", _fsNormalizeUrl('" + depfname + "')";
      } else if (typeof projInfo.deps[p] == 'string') {
        amdWrap += ", '" + projInfo.deps[p].replace(/\^/g, '') + "'";
      } else {
        amdWrap += ", '" + Object.keys(projInfo.deps[p])[0] + "'";
      }
    }
    amdWrap += "], function(";
    dpcount = 0;
    for (var dp in topdeps) {
      if (dpcount > 0) {
        amdWrap += ', ';
      }
      amdWrap += topdeps[dp];
      dpcount++;
    }

    for (p = 0; p < projInfo.deps.length; p++) {
      if (typeof projInfo.deps[p] == 'string') {
        amdWrap += ", " + ((projInfo.deps[p].split('.')[1]) || projInfo.deps[p]);
      } else {
        amdWrap += ', ' + projInfo.deps[p][Object.keys(projInfo.deps[p])[0]];
      }
    }
    amdWrap += ") {\n<%= contents %>\n});";
  } else {
    amdWrap += "], function(";
    dpcount = 0;
    for (var dp in topdeps) {
      if (dpcount > 0) {
        amdWrap += ', ';
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
  buildProm.makePromises(["codeready"], function () {
    if (writefile) {
      for (var fli = 0; fli < finalFiles.length; fli++) {
        var fl = finalFiles[fli],
          flloc = distloc + '/' + fl.relative;
        try {
          fs.accessSync(distloc, fs.F_OK);
        } catch (e) {
          fs.mkdirSync(distloc);
        }
        //
        var fcontents = finalFiles[0].contents.toString('utf-8');
        finalFiles[0].contents = new Buffer(fcontents);
        fs.writeFileSync(flloc, finalFiles[0].contents, 'utf-8');
      }
    }
    process.nextTick(function () {
      if (cb) {
        cb(proj, finalFiles);
      }
    });
  });

  gulp.src([externprefix + '/clientcode/tags/' + codever + '/src/' + proj + '/**/*.js'])
    .pipe(exclude('**/test/**'))
    .pipe(jshint())
    .pipe(jshint.reporter(stylish))
    .pipe(jsmodule('fs.' + proj.toLowerCase() + '.js'))
    .pipe(pragma({
      amd: !skipAMD,
      notamd: !!skipAMD,
      debug: !isProd
    }))
    .pipe(greplace(/\$\{versionTag\}/gi, pjson.version))
    .pipe(greplace(/\$\{events\}/gi, clientProperties.client.events))
    .pipe(gulpif(skipAMD, wrap('<%= contents %>'), wrap(amdWrap)))
    .pipe(header(getBuildHeader(projInfo.name, pjson), pjson))
    .pipe(gulpif(isProd, uglify(uglifySetts), prettify(prettifySetts)))
    .pipe(bufferize(function (fl) {
      finalFiles.push(fl);
    }))
    .pipe(gcallback(function () {
      if (!hasdeps) {
        buildProm.deliverPromise("codeready");
      }
    }));
};

/**
 * Build templates assets
 */
gulp.task('_templates', function (cb) {
  var templateproducts = fsGulpUtil.getDirectories('./templates/'),
    templateProm = new bityProm(function () {
      if (cb) {
        cb();
      }
    }, function () {
      throw new Error("Failed building the templates.");
    }, 10000);
  for (var p = 0; p < templateproducts.length; p++) {
    if (templateproducts[p] == 'custom') {
      templateproducts.splice(p--, 1);
    }
  }
  templateProm.make(templateproducts);

  // Loop through each subfolder, and build the templates inside
  for (var p = 0; p < templateproducts.length; p++) {
    var srcpath = './templates/' + templateproducts[p] + '/',
      dirs = fs.readdirSync(srcpath).filter(function (file) {
        return fs.statSync(path.join(srcpath, file)).isDirectory();
      }),
      i,
      promiselist = [],
      myProm = new promise();
    for (i = 0; i < dirs.length; i++) {
      promiselist.push("sass___" + dirs[i]);
      promiselist.push("img___" + dirs[i]);
      promiselist.push("font___" + dirs[i]);
      promiselist.push("assets___" + dirs[i]);
      promiselist.push("html___" + dirs[i]);
    }
    // Set up the promises
    myProm.makePromises(promiselist, function (prod) {
      return function () {
        templateProm.resolve(prod);
      };
    }(templateproducts[p]));
    for (i = 0; i < dirs.length; i++) {
      var destfiles = pjson.build.dist + '/code/' + pjson.code_version + '/templates/' + templateproducts[p] + '/' + dirs[i];
      gulp.src(srcpath + dirs[i] + '/sass/**/*.scss')
        .pipe(sass().on('error', function () {
          console.log("SASS ERROR: ", arguments);
        }))
        .pipe(cssmin())
        .pipe(gulp.dest(destfiles))
        .pipe(myProm.deliverGulpPromise('sass___' + dirs[i]));
      gulp.src(srcpath + dirs[i] + '/images/**/*.*')
        .pipe(gulp.dest(destfiles))
        .pipe(myProm.deliverGulpPromise('img___' + dirs[i]));
      gulp.src(srcpath + dirs[i] + '/fonts/**/*.*')
        .pipe(gulp.dest(destfiles))
        .pipe(myProm.deliverGulpPromise('font___' + dirs[i]));
      gulp.src(srcpath + dirs[i] + '/assets/**/*.*')
        .pipe(gulp.dest(destfiles))
        .pipe(myProm.deliverGulpPromise("assets___" + dirs[i]));
      gulp.src(srcpath + dirs[i] + '/html/**/*.*')
        .pipe(gulpjsonp({
          callback: "__fsJSONPCB",
          key: ('templates/' + templateproducts[p] + '/' + dirs[i] + "/").split('/').join('_')
        }))
        .pipe(gulp.dest(destfiles))
        .pipe(myProm.deliverGulpPromise('html___' + dirs[i]));
    }
  }
});

/**
 * Build custom templates assets
 */
gulp.task('_customtemplates', function (cb) {
  var templateproducts = fsGulpUtil.getDirectories('./templates/custom/'),
    templateProm = new bityProm(function () {
      if (cb) {
        cb();
      }
    }, function () {
      throw new Error("Failed building the custom templates.");
    }, 10000);
  templateProm.make(templateproducts);

  // Loop through each subfolder, and build the templates inside
  for (var p = 0; p < templateproducts.length; p++) {
    var srcpath = './templates/custom/' + templateproducts[p] + '/',
      dirs = fs.readdirSync(srcpath).filter(function (file) {
        return fs.statSync(path.join(srcpath, file)).isDirectory();
      }),
      i,
      promiselist = [],
      myProm = new promise();
    if (dirs.length == 0) {
      templateProm.resolve(templateproducts[p])
    }
    for (i = 0; i < dirs.length; i++) {
      promiselist.push("sass___" + dirs[i]);
      promiselist.push("img___" + dirs[i]);
      promiselist.push("font___" + dirs[i]);
      promiselist.push("assets___" + dirs[i]);
      promiselist.push("html___" + dirs[i]);
    }
    // Set up the promises
    myProm.makePromises(promiselist, function (prod) {
      return function () {
        templateProm.resolve(prod);
      };
    }(templateproducts[p]));
    for (i = 0; i < dirs.length; i++) {
      var destfiles = pjson.build.dist + '/' + templateproducts[p] + '/templates/' + dirs[i];
      gulp.src(srcpath + dirs[i] + '/sass/**/*.scss')
        .pipe(sass().on('error', function () {
          console.log("SASS ERROR: ", arguments);
        }))
        .pipe(cssmin())
        .pipe(gulp.dest(destfiles))
        .pipe(myProm.deliverGulpPromise('sass___' + dirs[i]));
      gulp.src(srcpath + dirs[i] + '/images/**/*.*')
        .pipe(gulp.dest(destfiles))
        .pipe(myProm.deliverGulpPromise('img___' + dirs[i]));
      gulp.src(srcpath + dirs[i] + '/fonts/**/*.*')
        .pipe(gulp.dest(destfiles))
        .pipe(myProm.deliverGulpPromise('font___' + dirs[i]));
      gulp.src(srcpath + dirs[i] + '/assets/**/*.*')
        .pipe(gulp.dest(destfiles))
        .pipe(myProm.deliverGulpPromise("assets___" + dirs[i]));
      gulp.src(srcpath + dirs[i] + '/html/**/*.*')
        .pipe(gulpjsonp({
          callback: "__fsJSONPCB",
          key: ('templates/' + templateproducts[p] + '/' + dirs[i] + "/").split('/').join('_')
        }))
        .pipe(gulp.dest(destfiles))
        .pipe(myProm.deliverGulpPromise('html___' + dirs[i]));
    }
  }
});

/**
 * Default task for building the SDK
 */
gulp.task('sdk', ['_cleandist', '_pullextern'], function (cb) {
  // Ensure that the destination folder is present
  if (!fs.existsSync(pjson.build.dist)) {
    fs.mkdirSync(pjson.build.dist);
  }
  if (!fs.existsSync(pjson.build.dist + '/code')) {
    fs.mkdirSync(pjson.build.dist + '/code');
  }
  if (!fs.existsSync(pjson.build.dist + '/code/' + pjson.code_version)) {
    fs.mkdirSync(pjson.build.dist + '/code/' + pjson.code_version);
  }
  if (isProd) {
    console.log("***********************************************************".magenta);
    console.log("*******".magenta + " PROD CODE".yellow + "        **********************************".magenta);
    console.log("***********************************************************".magenta);
  } else {
    console.log("***********************************************************".magenta);
    console.log("*******".magenta + " DEBUG CODE".gray + "         ********************************".magenta);
    console.log("***********************************************************".magenta);
  }

  // Run tasks in sequence
  runSequence(['_templates', '_customtemplates', '_images', '_html', '_clientassets'], function () {
    var projsToBuild = Object.keys(projectsToBuild),
      projProm = new bityProm(function () {
        if (cb) {
          cb();
        }
      }, function () {
        throw new Error("Problem with SDK build.");
      }, 30000);

    // Make promises
    projProm.make(projsToBuild);

    var distloc = pjson.build.dist + '/code/' + pjson.code_version,
      codever = pjson.code_version,
      projdeps = {
        'require': 'require',
        'fs': 'fs'
      };

    // Copy the gateway file over
    fs.writeFileSync(distloc + '/fs.gateway.js', fs.readFileSync(pjson.build.extern + '/gateway/tags/' + pjson.gateway_version + '/dist/gateway' + (isProd ? '.min' : '') + '.js', 'utf-8'));

    // Loop over the projects and build them all
    for (var i = 0; i < projsToBuild.length; i++) {
      var proj = projsToBuild[i];
      buildJSProject(codever, distloc, proj, projectsToBuild[proj], projdeps, true, function (pj) {
        return function () {
          projProm.resolve(pj);
        };
      }(proj));
    }
  });
});

/**
 * Prod build for SDK
 */
gulp.task('sdk_prod', ['sdk']);
gulp.task('test_prod', ['test_debug']);

/**
 * Test debug code. Start a web server for testing.
 */
gulp.task('test_debug', ['sdk', '_clientassets'], function (cb) {
  // Set an instance UID
  var instanceUID = uuidV4().toString().replace(/-/gi, '').substr(0, 10);

  // Handles text file requests
  var textfilehandler = function (filename, contents, headers) {
      if (filename.indexOf('gateway.js') > -1 || filename.indexOf('gateway.min.js') > -1 || filename.indexOf('gatewayconfig.js') > -1 || filename.indexOf('gatewayconfig.min.js') > -1) {
        // Holds the global config
        var globalConfig = {
            codeVer: pjson.code_version,
            products: {
              record: fsGulpUtil.arrayHasValue(clientProperties.client.productsToBuild, "record"),
              trigger: fsGulpUtil.arrayHasValue(clientProperties.client.productsToBuild, "trigger"),
              feedback: fsGulpUtil.arrayHasValue(clientProperties.client.productsToBuild, "feedback")
            },
            storage: clientProperties.client.persistence,
            brainUrl: clientProperties.client.brainurl,
            recUrl: clientProperties.client.transporturl,
            surveyUrl: clientProperties.client.surveyurl,
            analyticsUrl: clientProperties.client.events,
            staticUrl: clientProperties.client.static,
            cookieDomain: clientProperties.client.cookieDomain,
            cookieSecure: clientProperties.client.cookieSecure
          },
          feedbackProdConfig = fs.readFileSync(pjson.build.config + '/productconfig/feedback/product_config.js', 'utf8').toString(),
          feedbackGWConfig = fs.readFileSync(pjson.build.config + '/productconfig/feedback/gateway_config.js', 'utf8').toString(),
          recordProdConfig = fs.readFileSync(pjson.build.config + '/productconfig/record/product_config.js', 'utf8').toString(),
          recordGWConfig = fs.readFileSync(pjson.build.config + '/productconfig/record/gateway_config.js', 'utf8').toString(),
          triggerProdConfig = fs.readFileSync(pjson.build.config + '/productconfig/trigger/product_config.js', 'utf8').toString(),
          triggerGWConfig = fs.readFileSync(pjson.build.config + '/productconfig/trigger/gateway_config.js', 'utf8').toString(),
          svDefFiles = fs.readdirSync(pjson.build.config + '/productconfig/trigger/surveydef').filter(function (file) {
            if (!!file.match(/^\./)) {
              return;
            }
            // Make sure we're reading only files.
            return fs.statSync(path.join(pjson.build.config + '/productconfig/trigger/surveydef', file)).isFile();
          });
        svDefFiles.sort();
        for (var i = 0; i < svDefFiles.length; i++) {
          svDefFiles[i] = {
            name: svDefFiles[i],
            contents: fs.readFileSync(pjson.build.config + '/productconfig/trigger/surveydef/' + svDefFiles[i], 'utf8').toString()
          };
        }

        // See if we should add record anyway
        if (!globalConfig.products.record) {
          if (globalConfig.products.trigger) {
            for (var p = 0; p < svDefFiles.length; p++) {
              if (svDefFiles[p].contents.match(/["']*cxRecord["']*:\s*true/g)) {
                globalConfig.products.record = true;
                break;
              }
            }
          }
          if (globalConfig.products.feedback) {
            if (feedbackProdConfig.match(/["']*replay["']*:\s*true/g)) {
              globalConfig.products.record = true;
            }
          }
        }
        var globalConfigStr = "globalConfig = " + JSON.stringify(globalConfig) + ";\n\n",
          productConfigStr = "";
        if (globalConfig.products.feedback) {
          feedbackGWConfig = feedbackGWConfig.replace(/\/\*\*[^@\/]*@preserve[^\@\/]*@@CONFIG_GOES_HERE@@[^\/]*\//gi, feedbackProdConfig);
          productConfigStr += "productConfig.feedback = " + feedbackGWConfig + ";\n\n";
        }
        if (globalConfig.products.record) {
          recordGWConfig = recordGWConfig.replace(/\/\*\*[^@\/]*@preserve[^\@\/]*@@CONFIG_GOES_HERE@@[^\/]*\//gi, recordProdConfig);
          productConfigStr += "productConfig.record = " + recordGWConfig + ";\n\n";
        }
        if (globalConfig.products.trigger) {
          var sdef = "";
          for (var k = 0; k < svDefFiles.length; k++) {
            var defObStr = fsGulpUtil.simpleMinifyJSString(svDefFiles[k].contents);
            sdef += "'" + fsGulpUtil.b64EncodeUnicode(defObStr) + "'";
            if (k !== svDefFiles.length - 1) {
              sdef += ', ';
            }
          }
          triggerProdConfig = triggerProdConfig.replace(/\/\*\*[^@\/]*@preserve[^\@\/]*@@SVCONFIG_GOES_HERE@@[^\/]*\//gi, 'var surveydefs = [' + sdef + '];');
          triggerGWConfig = triggerGWConfig.replace(/\/\*\*[^@\/]*@preserve[^\@\/]*@@CONFIG_GOES_HERE@@[^\/]*\//gi, triggerProdConfig);
          productConfigStr += "productConfig.trigger = " + triggerGWConfig + ";\n\n";
        }
        contents = contents.toString().replace(/\/\*\*[^@\/]*@preserve[^\[\/]*\[GENERAL_CONFIG\][^\/]*\//gi, globalConfigStr + productConfigStr);
        contents = contents.replace(/\${staticCodeLocation}/gi, '/code/');
        contents = contents.replace(/\${versionTag}/gi, instanceUID);
        contents = contents.replace(/\${recTransportUrl}/gi, clientProperties.client.transporturl);
        contents = contents.replace(/\${hasreplay}/gi, globalConfig.products.record.toString());
        contents = lotemplate(contents)(clientProperties);
        contents = beautify(contents, {indent_size: 2});
      }
      return contents;
    },

    serverDirs = ['./dist', './smoketest', pjson.build.extern + '/gateway/tags/' + pjson.gateway_version + '/dist'],

    // Start an SSL server
    startServerSSL = function () {
      handydevserver(
        pjson.build.ports[1],
        serverDirs,
        {
          ssl: true,
          ignore: ['DS_Store', '_selfhost_', 'embed.txt', '.zip'],
          latency: 250,
          ontextfile: textfilehandler
        });
      fsGulpUtil.signal('SSL Server Started', 'Build complete. Web server running at https://localhost:' + pjson.build.ports[1] + '...');
    };

  // Start a non-SSL server
  var startServer = function () {
    handydevserver(
      pjson.build.ports[0],
      serverDirs,
      {
        ssl: false,
        ignore: ['DS_Store', '_selfhost_', 'embed.txt', '.zip'],
        latency: 250,
        ontextfile: textfilehandler
      });
    process.nextTick(function () {
      fsGulpUtil.signal('Server Started', 'Build complete. A web server running at http://localhost:' + pjson.build.ports[0] + '...');
    });
  };

  startServer();

  if (isSSL) {
    startServerSSL();
  }
});

/*********************************************************************************************/
/*                                  FEEDBACK SPECIFIC TASKS                                  */
/*********************************************************************************************/

/**
 * Build everything prod mode and copy to preview
 */
gulp.task('preview_prod', ['sdk_prod'], function () {
  rimraf('./preview/*', function () {
    console.log("Cleared preview folder.".yellow);
    var previewContainer = fs.readFileSync('./smoketest/testpages/feedback/_previewframe.html');
    fs.writeFile("./preview/previewframe.html", previewContainer, function (err) {
      if (err) {
        console.log("There was an error generating the preview frame: ", err);
      }
    });
    var previewBadgeContainer = fs.readFileSync('./smoketest/testpages/feedback/_previewbadge.html');
    fs.writeFile("./preview/previewbadge.html", previewBadgeContainer, function (err) {
      if (err) {
        console.log("There was an error generating the preview frame: ", err);
      }
    });
    var globalConfig = {
      codeVer: pjson.code_version,
      products: {
        record: false,
        trigger: false,
        feedback: true
      },
      storage: clientProperties.client.persistence,
      brainUrl: clientProperties.client.brainurl,
      recUrl: clientProperties.client.transporturl,
      surveyUrl: clientProperties.client.surveyurl,
      analyticsUrl: clientProperties.client.events,
      staticUrl: clientProperties.client.static,
      cookieDomain: clientProperties.client.cookieDomain,
      cookieSecure: clientProperties.client.cookieSecure
    };
    var gatewayfile = fs.readFileSync(pjson.build.extern + '/gateway/tags/' + pjson.gateway_version + '/dist/gateway.js').toString();
    var gatewaycfgfile = fs.readFileSync(pjson.build.extern + '/gateway/tags/' + pjson.gateway_version + '/dist/gatewayconfig.min.js').toString();
    var snippet = "productConfig.feedback = " + fsGulpUtil.parseGWConfigFile(pjson.build.config + '/productconfig/feedback/gateway_config.js') + ";";
    snippet = '_moduleLocationOverride = \'preview/code/' + pjson.code_version + '/\'; globalConfig = ' + JSON.stringify(globalConfig) + ';' + snippet;

    gatewayfile = gatewayfile.toString().replace(/\/\*\*[^@\/]*@preserve[^\[\/]*\[GENERAL_CONFIG\][^\/]*\//gi, snippet);
    gatewayfile = gatewayfile.toString().replace(/\${versionTag}/gi, pjson.version.toString());
    gatewaycfgfile = gatewaycfgfile.toString().replace(/\/\*\*[^@\/]*@preserve[^\[\/]*\[GENERAL_CONFIG\][^\/]*\//gi, snippet);
    gatewaycfgfile = gatewaycfgfile.toString().replace(/\${versionTag}/gi, pjson.version.toString());
    fs.writeFile("./preview/gateway.js", gatewayfile, function (err) {
      if (err) {
        console.log("There was an error generating the gateway file: ", err);
      }
    });
    fs.writeFile("./preview/gatewayconfig.min.js", gatewaycfgfile, function (err) {
      if (err) {
        console.log("There was an error generating the gateway config file: ", err);
      }
    });

    // Pull everything and put it in the preview folder
    gulp.src(pjson.build.previewsrc)
      .pipe(gulp.dest(pjson.build.previewdst));
    console.log("Copying contents of ./dist to ./preview/code".yellow);
    var didonce = false;
    fs.mkdirSync('./preview/code/');
    copydir.sync('./dist/code/' + pjson.code_version, './preview/code/' + pjson.code_version);
    fs.writeFile("./preview/code/" + pjson.code_version + "/fs.gateway.js", gatewayfile, function (err) {
      if (err) {
        console.log("There was an error generating the gateway file: ", err);
      }
    });
    fs.writeFile("./preview/code/" + pjson.code_version + "/fs.gatewayconfig.js", gatewaycfgfile, function (err) {
      if (err) {
        console.log("There was an error generating the gateway config file: ", err);
      }
    });
    console.log("Starting server on 8080...");
    process.nextTick(function () {
      handydevserver(
        8080,
        ['./'],
        {});
    });

    console.log("Starting ssl server on 443...");
    process.nextTick(function () {
      handydevserver(
        443,
        ['./'],
        {ssl:true});
    });
  });
});

/**
 * Debug version
 */
gulp.task('preview_debug', ['preview_prod'], function (cb) {
  if (cb) {
    cb();
  }
});

/*********************************************************************************************/
/*                            CLIENT LOOKUP AND CREATION TASKS                               */
/*********************************************************************************************/

/**
 * List of clients
 */
gulp.task('list_clients', function (cb) {
  console.log("Listing clients...".magenta);
  FcpClient.promptForFCPCredentials({}, function (rs) {
    /**
     * Set up an instance of the FCP client
     * @type {FCPClient}
     */
    var fcp = new FcpClient(rs.username, rs.password, rs.environment);
    fcp.listClients(function (success, data) {
      if (!success) {
        console.log("Was not able to connect. Message: ".red, data);
      } else {
        console.log("Complete client list (".yellow + data.length.toString().magenta + " results):".yellow);
        for (var i = 0; i < data.length; i++) {
          var client = data[i];
          if (i > 0) {
            console.log("---------------------------------------------".grey);
          }
          console.log("   Client: ".magenta, "[ID: ".grey + client.id.toString().yellow + "]".grey, client.name, (client.deleted != 0) ? "DELETED".red : "");
          console.log(" metadata: ".magenta, client.metadata);
        }
      }
    });
  });
});

/**
 * Look up a client
 */
gulp.task('client_lookup', function (cb) {
  console.log("Looking up a client. Provide a search term:".magenta);
  fsGulpUtil.promptForValuesIfNeeded({
    client_search_term: null
  }, function (res) {
    if (res.client_search_term && res.client_search_term.length > 0) {
      res.client_search_term = res.client_search_term.trim().replace(/[ ]{2,}/g, ' ');
      console.log("Searching for clients with the term: ".magenta + "\"" + res.client_search_term.yellow + "\"" + "..".magenta);
      FcpClient.promptForFCPCredentials({}, function (rs) {
        /**
         * Set up an instance of the FCP client
         * @type {FCPClient}
         */
        var fcp = new FcpClient(rs.username, rs.password, rs.environment);
        fcp.lookupClient(res.client_search_term, function (success, data) {
          if (!success) {
            console.log("Was not able to connect. Message: ".red, data);
          } else {
            console.log("Client results (".yellow + data.clients.length.toString().magenta + " results):".yellow);
            for (var i = 0; i < data.clients.length; i++) {
              var client = data.clients[i];
              if (i > 0) {
                console.log("---------------------------------------------".grey);
              }
              console.log("   Client: ".magenta, "[ID: ".grey + client.id.toString().yellow + "]".grey, client.name, (client.deleted != 0) ? "DELETED".red : "");
              console.log(" metadata: ".magenta, client.metadata);
            }
            console.log("\n\nSite results (".yellow + data.sites.length.toString().magenta + " results):".yellow);
            for (var i = 0; i < data.sites.length; i++) {
              var site = data.sites[i];
              if (i > 0) {
                console.log("---------------------------------------------".grey);
              }
              console.log("     Site: ".magenta, site.name);
              console.log("   Client: ".magenta, "[ID: ".grey + site.client_id.toString().yellow + "]".grey, (site.deleted != 0) ? "DELETED".red : "");
            }
          }
        });
      });
    } else {
      console.log("You must provide a search term.".red);
      if (cb) {
        cb();
      }
    }
  })
});

/**
 * Make a client
 */
gulp.task('create_client', function (cb) {
  console.log("Creating a client.".magenta, "NOTE: ".yellow, "You should search for a client first by calling ", "client_lookup".grey, "!");
  console.log("Metadata can be the website URL, client contact name, other trademarks, etc. This is useful for searching.");
  console.log("Client ID should be a non-zero integer.".yellow);
  fsGulpUtil.promptForValuesIfNeeded({
    client_name: null,
    metadata: null,
    client_id: null
  }, function (res) {
    if (res.client_name && res.client_name.length > 0 && res.metadata && res.metadata.length > 0) {
      res.client_name = res.client_name.trim().replace(/[ ]{2,}/g, ' ');
      res.metadata = res.metadata.trim().replace(/[ ]{2,}/g, ' ');
      if (res.client_name.length > 45) {
        res.client_name = res.client_name.substr(0, 45);
      }
      res.client_id = parseInt(res.client_id);
      if (isNaN(res.client_id) || res.client_id === 0) {
        throw new Error("Invalid client id!");
      }
      console.log("Making a client with the name: ".magenta + "\"" + res.client_name.yellow + "\"" + "..".magenta);
      FcpClient.promptForFCPCredentials({}, function (rs) {
        /**
         * Set up an instance of the FCP client
         * @type {FCPClient}
         */
        var fcp = new FcpClient(rs.username, rs.password, rs.environment);
        fcp.makeClient(res.client_id, res.client_name, res.metadata, 'Created client ' + res.client_name, function (success, client) {
          if (!success) {
            console.log("Was not able to connect. Message: ".red, client);
          } else {
            console.log("   Client: ".magenta, "[ID: ".grey + client.id.toString().yellow + "]".grey, client.name, (client.deleted != 0) ? "DELETED".red : "");
            console.log(" metadata: ".magenta, client.metadata);
          }
        });
      });
    } else {
      console.log("You must provide all values.".red);
      if (cb) {
        cb();
      }
    }
  })
});

/**
 * Make a site_key
 */
gulp.task('create_site', function (cb) {
  FcpClient.promptForFCPCredentials({
    clientId: true
  }, function (rs) {
    console.log("Creating a site for client id ".magenta + rs.clientId.toString().yellow + ".".magenta);
    /**
     * Set up an instance of the FCP client
     * @type {FCPClient}
     */
    var fcp = new FcpClient(rs.username, rs.password, rs.environment);
    fcp.getClient(rs.clientId, function (success, client) {
      if (!success) {
        console.log("Was not able to connect. Message: ".red, client);
      } else {
        console.log("   Client: ".magenta, "[ID: ".grey + client.id.toString().yellow + "]".grey, client.name, (client.deleted != 0) ? "DELETED".red : "");
        console.log(" metadata: ".magenta, client.metadata);
        fsGulpUtil.promptForValuesIfNeeded({
          sitekey: null
        }, function (res) {
          if (res.sitekey && res.sitekey.length > 0) {
            res.sitekey = res.sitekey.trim().replace(/[ \t\n\r]/g, '').toLowerCase();
            if (res.sitekey.length > 45) {
              res.sitekey = res.sitekey.substr(0, 45);
            }
            fcp.doesSiteKeyExist(res.sitekey, function (success, exists, clientinfo) {
              if (!success) {
                console.log("Could not look up site.".red);
                process.exit();
              } else {
                if (exists) {
                  console.log("Unfortunately, that sitekey (".red + res.sitekey.yellow + ") already exists and is assigned to client ".red + clientinfo.client_id.toString().red + "...".red);
                  process.exit();
                } else {
                  console.log("Making a site key with the name: ".magenta + "\"" + res.sitekey.yellow + "\"" + "..".magenta);
                  fcp.makeSite(res.sitekey, rs.clientId, 'Created site key ' + res.sitekey, function (success, site) {
                    if (!success) {
                      console.log("Was not able to connect. Message: ".red, site);
                    } else {
                      console.log("Site ".magenta, site.name, "was created.".magenta);
                      if (cb) {
                        cb();
                      }
                    }
                  });
                }
              }
            });
          } else {
            console.log("You must provide a site key.".red);
            if (cb) {
              cb();
            }
          }
        });
      }
    });
  });
});

/**
 * Posts code to dev/qa/qa2/stg
 */
gulp.task('push_code_test_envs', ['push_code']);

/**
 * Posting Debug code to FCP
 */
gulp.task('push_code_debug', ['push_code']);

/**
 * Post code to FCP
 */
gulp.task('push_code', ['sdk'], function (cb) {
  if (!semver.valid(pjson.version)) {
    console.log("Version ".red, pjson.version.red, "is not a valid semver version.".red);
    return;
  }
  if (clientProperties.client.clientid === 0) {
    console.log("Client ID is not defined in client_properties.".red);
    return;
  }
  if (!clientProperties.client.sitekey || clientProperties.client.sitekey.length == 0) {
    console.log("Site key is not valid in client_properties.".red);
    return;
  }
  console.log("Packaging code version for FCP: ".magenta, pjson.version.toString().yellow, ".".magenta);
  var distloc = pjson.build.dist + '/code/' + pjson.code_version;
  zipdir(distloc, function (err, buffer) {
    if (err) {
      console.log("Could not zip the code: ", err);
    } else {
      console.log("Zip file size: ", buffer.length, "... Preparing to upload...");
      FcpClient.promptForFCPCredentials({
        notes: true,
        // whether or not we prompt for 'latest'; true, unless we are using one of the bash scripts
        latest: !testEnvs && !argv.dev,
        disableEnv: !!testEnvs || argv.dev
      }, function (rs) {
        var fcp;
        var completePost = function (env) {
          fcp = new FcpClient(rs.username, rs.password, env);
          console.log("About to push code version..");
          fcp.postCodeVersion(buffer, rs.notes, pjson.version, rs.latest, function (success, data) {
            if (!success) {
              console.log("Did not succeed posting files".red, data);
            } else {
              console.log("Success:", data.toString().magenta);
            }
          });
        };
        if (testEnvs) {
          for (var i = 1, len = 3; i <= len; i++) {
            var es = FcpClient.environmentShort[i];
            console.log("Pushing Code to: ", es);
            completePost(FcpClient.environments[es]);
          }
        } else if (argv.dev) {
          console.log("Pushing Code to: dev");
          completePost(FcpClient.environments['dev']);
        } else if (rs.environment == FcpClient.environments.prod && !isProd) {
          // if push_code_debug was called on prod
          console.log("Terminating: will not push debug code to production".red);
        } else {
          completePost(rs.environment);
        }
      });
    }
  });
});

/**
 * Push the default config
 */
gulp.task('push_default_config', ['_pullextern'], function (cb) {
  FcpClient.promptForFCPCredentials({}, function (rs) {
    var defCfg = JSON.parse(fs.readFileSync(pjson.build.extern + '/clientcode/tags/' + pjson.code_version + '/src/default_global_config.json').toString());
    defCfg.codeVer = pjson.version;
    defCfg.minGatewayVersion = pjson.minGWVer;
    defCfg.alwaysOnLatest = 1;
    defCfg.storage = clientProperties.client.persistence;
    defCfg.brainUrl = clientProperties.client.brainurl;
    defCfg.recUrl = clientProperties.client.transporturl;
    defCfg.surveyUrl = clientProperties.client.surveyurl;
    defCfg.analyticsUrl = clientProperties.client.events;
    defCfg.staticUrl = clientProperties.client.static;
    defCfg.cookieDomain = clientProperties.client.cookieDomain;
    defCfg.cookieSecure = clientProperties.client.cookieSecure;

    if (rs.environment == FcpClient.environments.dev) {
      console.log("FCP environment:".magenta, "DEV".yellow);
      defCfg.brainUrl = defCfg.brainUrl.replace(/brain/, 'dev-brain');
      defCfg.surveyUrl = defCfg.surveyUrl.replace(/survey/, 'survey-dev');
      defCfg.recUrl = defCfg.recUrl.replace(/rec/, 'dev-rec');
      defCfg.analyticsUrl = defCfg.analyticsUrl.replace(/analytics/, 'dev-analytics');
    } else if (rs.environment == FcpClient.environments.qa) {
      console.log("FCP environment:".magenta, "QA".yellow);
      defCfg.brainUrl = defCfg.brainUrl.replace(/brain/, 'qa-brain');
      defCfg.surveyUrl = defCfg.surveyUrl.replace(/survey/, 'survey-qa');
      defCfg.recUrl = defCfg.recUrl.replace(/rec/, 'qa-rec');
      defCfg.analyticsUrl = defCfg.analyticsUrl.replace(/analytics/, 'qa-analytics');
    } else if (rs.environment == FcpClient.environments.qa2) {
      console.log("FCP environment:".magenta, "QA2".yellow);
      defCfg.brainUrl = defCfg.brainUrl.replace(/brain/, 'qa-brain');
      defCfg.surveyUrl = defCfg.surveyUrl.replace(/survey/, 'survey-qa');
      defCfg.recUrl = defCfg.recUrl.replace(/rec/, 'qa-rec');
      defCfg.analyticsUrl = defCfg.analyticsUrl.replace(/analytics/, 'qa-analytics');
    } else if (rs.environment == FcpClient.environments.prod) {
      console.log("FCP environment:".magenta, "PROD".yellow);
    }

    console.log("About to push a new default global configuration. Here it is:".magenta);
    console.log(defCfg);

    /**
     * Set up an instance of the FCP client
     * @type {FCPClient}
     */
    var fcp = new FcpClient(rs.username, rs.password, rs.environment);
    fcp.postDefaultConfig(JSON.stringify(defCfg), "Posted a new default configuration (" + pjson.version + ")", function (success, result) {
      if (!success) {
        console.log("Was not able to connect. Message: ".red, result);
      } else {
        console.log("Success: ".magenta, result);
        if (cb) {
          cb();
        }
      }
    });
  });
});

/**
 * Get the default config for an env.
 */
var getDefGlobalCfg = function (env) {
  var defCfg = JSON.parse(fs.readFileSync(pjson.build.extern + '/clientcode/tags/' + pjson.code_version + '/src/default_global_config.json').toString());
  defCfg.codeVer = pjson.version;
  defCfg.storage = clientProperties.client.persistence;
  defCfg.brainUrl = clientProperties.client.brainurl;
  defCfg.recUrl = clientProperties.client.transporturl;
  defCfg.surveyUrl = clientProperties.client.surveyurl;
  defCfg.analyticsUrl = clientProperties.client.events;
  defCfg.staticUrl = clientProperties.client.static;
  defCfg.cookieDomain = clientProperties.client.cookieDomain;
  defCfg.cookieSecure = clientProperties.client.cookieSecure;

  if (env == FcpClient.environments.dev) {
    console.log("FCP environment:".magenta, "DEV".yellow);
    defCfg.brainUrl = defCfg.brainUrl.replace(/brain/, 'dev-brain');
    defCfg.surveyUrl = defCfg.surveyUrl.replace(/survey/, 'survey-dev');
    defCfg.recUrl = defCfg.recUrl.replace(/rec/, 'dev-rec');
    defCfg.analyticsUrl = defCfg.analyticsUrl.replace(/analytics/, 'dev-analytics');
  } else if (env == FcpClient.environments.qa) {
    console.log("FCP environment:".magenta, "QA".yellow);
    defCfg.brainUrl = defCfg.brainUrl.replace(/brain/, 'qa-brain');
    defCfg.surveyUrl = defCfg.surveyUrl.replace(/survey/, 'survey-qa');
    defCfg.recUrl = defCfg.recUrl.replace(/rec/, 'qa-rec');
    defCfg.analyticsUrl = defCfg.analyticsUrl.replace(/analytics/, 'qa-analytics');
  } else if (env == FcpClient.environments.qa2) {
    console.log("FCP environment:".magenta, "QA2".yellow);
    defCfg.brainUrl = defCfg.brainUrl.replace(/brain/, 'qa-brain');
    defCfg.surveyUrl = defCfg.surveyUrl.replace(/survey/, 'survey-qa');
    defCfg.recUrl = defCfg.recUrl.replace(/rec/, 'qa-rec');
    defCfg.analyticsUrl = defCfg.analyticsUrl.replace(/analytics/, 'qa-analytics');
  } else if (env == FcpClient.environments.prod) {
    console.log("FCP environment:".magenta, "PROD".yellow);
  }
  return defCfg;
};

/**
 * Push the DEFAULT config
 */
gulp.task('push_stg_config', ['_pullextern'], function (cb) {
  FcpClient.promptForFCPCredentials({
    notes: true
  }, function (rs) {
    var defCfg = getDefGlobalCfg(rs.environment);
    console.log("About to push a new default global configuration. Here it is:".magenta);
    console.log(defCfg);
    /**
     * Set up an instance of the FCP client
     * @type {FCPClient}
     */
    var fcp = new FcpClient(rs.username, rs.password, rs.environment);
    fcp.makeContainer(clientProperties.client.sitekey, 'staging', clientProperties.client.clientid, rs.notes, function (success, message) {
      if (!success && message !== "Container name already exists") {
        console.log("Failed to create container: ".red + message.red, rs.environment);
      } else {
        fcp.postDefaultConfigForSiteContainer(clientProperties.client.sitekey, "staging", JSON.stringify(defCfg), "Posted a new default configuration (" + pjson.version + ")", function (success, result) {
          if (!success) {
            console.log("Was not able to connect. Message: ".red, result);
          } else {
            console.log("Success: ".magenta, result);
            if (cb) {
              cb();
            }
          }
        });
      }
    });
  });
});

/**
 * Push the DEFAULT config
 */
gulp.task('push_prod_config', ['_pullextern'], function (cb) {
  FcpClient.promptForFCPCredentials({
    notes: true
  }, function (rs) {
    var defCfg = getDefGlobalCfg(rs.environment);
    console.log("About to push a new default global configuration. Here it is:".magenta);
    console.log(defCfg);
    /**
     * Set up an instance of the FCP client
     * @type {FCPClient}
     */
    var fcp = new FcpClient(rs.username, rs.password, rs.environment);
    fcp.makeContainer(clientProperties.client.sitekey, 'production', clientProperties.client.clientid, rs.notes, function (success, message) {
      if (!success && message !== "Container name already exists") {
        console.log("Failed to create container: ".red + message.red, rs.environment);
      } else {
        fcp.postDefaultConfigForSiteContainer(clientProperties.client.sitekey, "production", JSON.stringify(defCfg), "Posted a new default configuration (" + pjson.version + ")", function (success, result) {
          if (!success) {
            console.log("Was not able to connect. Message: ".red, result);
          } else {
            console.log("Success: ".magenta, result);
            if (cb) {
              cb();
            }
          }
        });
      }
    });
  });
});

/**
 * Get a self-hosted zip
 */
gulp.task('get_self_hosted', ['sdk'], function (cb) {
  FcpClient.promptForFCPCredentials({}, function (rs) {

    var gatewayFile = fs.readFileSync(pjson.build.extern + '/gateway/tags/' + pjson.gateway_version + '/dist/gateway.min.js').toString();
    var sampleHTMLFile = fs.readFileSync('./bin/sampleselfhost_page.html').toString();
    var embedSnippet = fs.readFileSync('./bin/embedsnippet.html').toString();

    gatewayFile = gatewayFile.toString().replace(/\/\*\*[^@\/]*@preserve[^\[\/]*\[GENERAL_CONFIG\][^\/]*\//gi, "globalConfig = " + JSON.stringify({
        selfHosted: true,
        codeVer: pjson.code_version,
        siteKey: clientProperties.client.sitekey,
        gateway: pjson.fcp,
        configLocation: rs.frontEndEnvironment.replace('https://', '').replace('http://', '') + '/sites/' + clientProperties.client.sitekey
      }));

    embedSnippet = embedSnippet.replace(/\$\{JSURL\}/g, 'gateway.min.js');
    embedSnippet = embedSnippet.replace("\"data-vendor\": \"fs\",", "\"data-vendor\": \"fs\",\n          \"data-mode\": \"selfhost\",\n          \"data-environment\": \"production\",\n          \"data-hasssl\": \"true\",\n          \"data-client\": \"" + clientProperties.client.sitekey + "\",\n          \"data-codelocation\": \"/foresee_assets/code/" + pjson.code_version + "/\",\n          \"data-isselfhosted\": \"true\",\n          \"data-product-assets\": \"/foresee_assets/product_assets/\",")

    sampleHTMLFile = sampleHTMLFile.replace(/\{\$ver\}/g, pjson.version);
    sampleHTMLFile = sampleHTMLFile.replace(/\{\$embed\}/g, embedSnippet);

    fs.writeFileSync('./dist/embedsnippet.html', embedSnippet);
    fs.writeFileSync('./dist/sampleselfhost_page_production.html', sampleHTMLFile);
    fs.writeFileSync('./dist/sampleselfhost_page_staging.html', sampleHTMLFile.replace("\"production\"", "\"staging\""));
    fs.writeFileSync('./dist/gateway.min.js', gatewayFile);

    // This will do the final zip up
    var finishUpFn = function () {
      fs.mkdirSync('./dist/foresee_assets');
      fs.mkdirSync('./dist/foresee_assets/product_assets');
      var howmany = 0;

      howmany++;
      mv('./dist/code', './dist/foresee_assets/code', function () {
        howmany--;
      });

      if (fs.existsSync('./dist/trigger')) {
        howmany++;
        mv('./dist/trigger', './dist/foresee_assets/product_assets/trigger', function () {
          howmany--;
        });
      }
      if (fs.existsSync('./dist/feedback')) {
        howmany++;
        mv('./dist/feedback', './dist/foresee_assets/product_assets/feedback', function () {
          howmany--;
        });
      }
      if (fs.existsSync('./dist/record')) {
        howmany++;
        mv('./dist/record', './dist/foresee_assets/product_assets/record', function () {
          howmany--;
        });
      }
      // Keep checking
      var zipTimeout = setInterval(function() {
        if (howmany == 0) {
          console.log("Zipping ...");
          clearInterval(zipTimeout);
          zipdir('./dist', function (err, buffer) {
            if (err) {
              console.log("ERROR", err);
              process.exit();
            } else {
              var outfile = './dist/' + clientProperties.client.sitekey + "_selfhost.zip";
              fs.writeFileSync(outfile, buffer);
              console.log("Wrote file to ", outfile, "...");
              handydevserver(
                pjson.build.ports[0],
                ['./dist'],
                {
                  ssl: false,
                  ignore: ['DS_Store', '_selfhost_', 'embed.txt', '.zip'],
                  latency: 250,
                  ontextfile: function (filename, contents, headers) {
                    if (filename.indexOf('gateway') > -1 && filename.indexOf('.js') > -1) {
                      contents = contents.toString().replace(pjson.fcp, "myurl");
                      contents = new Buffer(contents);
                    }
                    return contents;
                  }
                });
              process.nextTick(function () {
                fsGulpUtil.signal('Server Started', 'Build complete. A web server running at http://localhost:' + pjson.build.ports[0] + '...');
              });
            }
          });
        }
      }, 250);

    };

    if (fs.existsSync('./dist/foresee_assets')) {
      rimraf('./dist/foresee_assets', finishUpFn);
    } else {
      finishUpFn();
    }

  });
});

/*********************************************************************************************/
/*                                      CODE PUSH TASKS                                      */
/*********************************************************************************************/

/**
 * Build the code and push
 * @param env
 * @constructor
 */
var BuildAndPushToEnv = function (environment, cb) {
  var globalConfig = {
      codeVer: pjson.code_version,
      products: {
        record: fsGulpUtil.arrayHasValue(clientProperties.client.productsToBuild, "record"),
        trigger: fsGulpUtil.arrayHasValue(clientProperties.client.productsToBuild, "trigger"),
        feedback: fsGulpUtil.arrayHasValue(clientProperties.client.productsToBuild, "feedback")
      },
      storage: clientProperties.client.persistence,
      brainUrl: clientProperties.client.brainurl,
      recUrl: clientProperties.client.transporturl,
      surveyUrl: clientProperties.client.surveyurl,
      analyticsUrl: clientProperties.client.events,
      staticUrl: clientProperties.client.static,
      cookieDomain: clientProperties.client.cookieDomain,
      cookieSecure: clientProperties.client.cookieSecure
    },
    feedbackProdConfig = fs.readFileSync(pjson.build.config + '/productconfig/feedback/product_config.js', 'utf8').toString(),
    feedbackGWConfig = fs.readFileSync(pjson.build.config + '/productconfig/feedback/gateway_config.js', 'utf8').toString(),
    recordProdConfig = fs.readFileSync(pjson.build.config + '/productconfig/record/product_config.js', 'utf8').toString(),
    recordGWConfig = fs.readFileSync(pjson.build.config + '/productconfig/record/gateway_config.js', 'utf8').toString(),
    triggerProdConfig = fs.readFileSync(pjson.build.config + '/productconfig/trigger/product_config.js', 'utf8').toString(),
    triggerGWConfig = fs.readFileSync(pjson.build.config + '/productconfig/trigger/gateway_config.js', 'utf8').toString(),
    svDefFiles = fs.readdirSync(pjson.build.config + '/productconfig/trigger/surveydef').filter(function (file) {
      if (!!file.match(/^\./)) {
        return;
      }
      // Make sure we're reading only files.
      return fs.statSync(path.join(pjson.build.config + '/productconfig/trigger/surveydef', file)).isFile();
    });
  svDefFiles.sort();
  for (var i = 0; i < svDefFiles.length; i++) {
    svDefFiles[i] = {
      name: svDefFiles[i],
      contents: fs.readFileSync(pjson.build.config + '/productconfig/trigger/surveydef/' + svDefFiles[i], 'utf8').toString()
    };
  }

  // See if we should add record anyway
  if (!globalConfig.products.record) {
    if (globalConfig.products.trigger) {
      for (var p = 0; p < svDefFiles.length; p++) {
        if (svDefFiles[p].contents.match(/["']*cxRecord["']*:\s*true/g)) {
          globalConfig.products.record = true;
          break;
        }
      }
    }
  }
  if (globalConfig.products.record) {
    recordGWConfig = recordGWConfig.replace(/\/\*\*[^@\/]*@preserve[^\@\/]*@@CONFIG_GOES_HERE@@[^\/]*\//gi, recordProdConfig);
  }
  if (globalConfig.products.trigger) {
    var sdef = "";
    for (var k = 0; k < svDefFiles.length; k++) {
      var defObStr = fsGulpUtil.simpleMinifyJSString(svDefFiles[k].contents);
      sdef += "'" + fsGulpUtil.b64EncodeUnicode(defObStr) + "'";
      if (k !== svDefFiles.length - 1) {
        sdef += ', ';
      }
    }
    triggerProdConfig = triggerProdConfig.replace(/\/\*\*[^@\/]*@preserve[^\@\/]*@@SVCONFIG_GOES_HERE@@[^\/]*\//gi, 'var surveydefs = [' + sdef + '];');
    triggerGWConfig = triggerGWConfig.replace(/\/\*\*[^@\/]*@preserve[^\@\/]*@@CONFIG_GOES_HERE@@[^\/]*\//gi, triggerProdConfig);
  }
  triggerGWConfig = triggerGWConfig.replace(/\${hasreplay}/gi, globalConfig.products.record.toString());
  triggerGWConfig = lotemplate(triggerGWConfig)(clientProperties);
  recordGWConfig = lotemplate(recordGWConfig)(clientProperties);
  feedbackGWConfig = feedbackGWConfig.replace(/\/\*\*[^@\/]*@preserve[^\@\/]*@@CONFIG_GOES_HERE@@[^\/]*\//gi, feedbackProdConfig);

  // Get the raw configs
  var feedbackConfigJSON = JSON.stringify(eval(feedbackProdConfig));
  var recordConfigJSON = eval(recordProdConfig);
  recordConfigJSON = JSON.stringify(config);
  var triggerConfigJSON = eval("var _fsDefine = function() {}; " + triggerProdConfig);
  triggerConfigJSON = JSON.stringify({config: triggerconfig, surveydefs: surveydefs});
  clientProperties.hasreplay = globalConfig.products.record.toString();
  feedbackConfigJSON = lotemplate(feedbackConfigJSON)(clientProperties);
  recordConfigJSON = lotemplate(recordConfigJSON)(clientProperties);
  triggerConfigJSON = lotemplate(triggerConfigJSON)(clientProperties);

  FcpClient.promptForFCPCredentials({
    notes: true
  }, function (rs) {
    // Store the username
    creds.username = rs.username;
    /**
     * Set up an instance of the FCP client
     * @type {FCPClient}
     */
    var fcp = new FcpClient(rs.username, rs.password, rs.environment, rs.notes);
    fcp.getClient(clientProperties.client.clientid, function (success, client) {
      if (!success) {
        console.log("Failed to connect to FCP.".red, client);
      } else {
        fcp.makeContainer(clientProperties.client.sitekey, environment, client.id, rs.notes, function (success, message) {
          if (!success && message !== "Container name already exists") {
            console.log("Failed to create container: ".red + message.red, rs.environment);
          } else {
            console.log(("Pushing code to " + (/push_prod/.test(taskName) ? "production" : " staging") + " for client " + clientProperties.client.clientid + ":").magenta, client.name.yellow, "on site key".magenta, clientProperties.client.sitekey.yellow, "...".magenta);
            console.log("Products being pushed:".magenta);
            if (globalConfig.products.record) {
              console.log("  * ".grey, "record".yellow);
            }
            if (globalConfig.products.trigger) {
              console.log("  * ".grey, "trigger".yellow);
            }
            if (skipPublishingFeedbackConfig && globalConfig.products.feedback) {
              console.log("  * ".grey, "will not push feedback (this should be done from the portal)".red);
            } else if (!skipPublishingFeedbackConfig && globalConfig.products.feedback) {
              console.log("  * ".grey, "feedback".yellow);
            }
            // Checks to see if everything is created
            var checker = function () {
                var didPass = false;
                if (globalConfig.products.trigger && globalConfig.products.record) {
                  didPass = didRecord && didTrigger;
                }
                if (globalConfig.products.trigger && !globalConfig.products.record) {
                  didPass = didTrigger;
                }
                if (!globalConfig.products.trigger && globalConfig.products.record) {
                  didPass = didRecord;
                }
                if (didPass && globalConfig.products.feedback && !skipPublishingFeedbackConfig) {
                  didPass = didFeedback;
                }
                if (didPass) {
                  if (cb) {
                    cb(rs);
                  }
                }
              },
              didTrigger = false,
              didRecord = false,
              didFeedback = false;
            if (globalConfig.products.trigger) {
              if (!fs.existsSync(pjson.build.dist + '/trigger')) {
                fs.mkdirSync(pjson.build.dist + '/trigger');
              }
              //fs.writeFileSync(pjson.build.dist + '/trigger/config.json', triggerConfigJSON);
              triggerGWConfig = fsGulpUtil.simpleMinifyJSString(triggerGWConfig);
              zipdir(pjson.build.dist + '/trigger', function (err, buffer) {
                if (err) {
                  console.log("Could not zip the product folder: ", err);
                } else {
                  fcp.pushCustomerConfigForProduct(
                    clientProperties.client.clientid,
                    clientProperties.client.sitekey,
                    environment,
                    "trigger",
                    triggerGWConfig,
                    buffer,
                    rs.notes,
                    function (success, result) {
                      if (!success) {
                        console.log("Failed to upload product trigger:", result);
                        return;
                      } else {
                        didTrigger = true;
                        console.log("Successfully uploaded product trigger.".green, result);
                        checker();
                      }
                    }, false, triggerConfigJSON);
                }
              });
            }
            if (globalConfig.products.record) {
              if (!fs.existsSync(pjson.build.dist + '/record')) {
                fs.mkdirSync(pjson.build.dist + '/record');
              }
              recordGWConfig = fsGulpUtil.simpleMinifyJSString(recordGWConfig);
              zipdir(pjson.build.dist + '/record', function (err, buffer) {
                if (err) {
                  console.log("Could not zip the product folder: ", err);
                } else {
                  fcp.pushCustomerConfigForProduct(
                    clientProperties.client.clientid,
                    clientProperties.client.sitekey,
                    environment,
                    "record",
                    recordGWConfig,
                    buffer,
                    rs.notes,
                    function (success, result) {
                      if (!success) {
                        console.log("Failed to upload product record:", result);
                        return;
                      } else {
                        didRecord = true;
                        console.log("Successfully uploaded product record.".green, result);
                        checker();
                      }
                    }, false, recordConfigJSON);
                }
              });
            }
            if (globalConfig.products.feedback && !skipPublishingFeedbackConfig) {
              if (!fs.existsSync(pjson.build.dist + '/feedback')) {
                fs.mkdirSync(pjson.build.dist + '/feedback');
              }
              feedbackGWConfig = fsGulpUtil.simpleMinifyJSString(feedbackGWConfig);
              zipdir(pjson.build.dist + '/feedback', function (err, buffer) {
                if (err) {
                  console.log("Could not zip the product folder: ", err);
                } else {
                  fcp.pushCustomerConfigForProduct(
                    clientProperties.client.clientid,
                    clientProperties.client.sitekey,
                    environment,
                    "feedback",
                    feedbackGWConfig,
                    buffer,
                    rs.notes,
                    function (success, result) {
                      if (!success) {
                        console.log("Failed to upload product feedback:", result);
                        return;
                      } else {
                        didFeedback = true;
                        console.log("Successfully uploaded product feedback.".green, result);
                        checker();
                      }
                    }, false, feedbackConfigJSON);
                }
              });
            }
          }
        });
      }
    });
  });
};

/**
 * Post config to FCP
 */
gulp.task('push_stg', ['sdk'], function (cb) {
  var container = "staging",
    emailOpts = /^[01]$/.test(envVariableOptions.email) ? {} : {sendCodeEmail: null};
  BuildAndPushToEnv(container, function (fcpRes) {
    console.log("Do you want to send a code delivery email to yourself?".yellow, "(1 = yes, 0 = no)".magenta);
    fsGulpUtil.promptForValuesIfNeeded(emailOpts, function (res) {
      if ((res && res.sendCodeEmail == 1) || (envVariableOptions && envVariableOptions.email && envVariableOptions.email.toString() == '1')) {
        var recipient = creds.username.substr(0, creds.username.indexOf('@')) + "@foresee.com";
        console.log("Sending delivery email to ".yellow + " " + recipient.magenta + "...");
        fsGulpUtil.sendClientCodeEmail(clientProperties.client.id, clientProperties.client.sitekey, recipient, container, fcpRes, function (emailSubject) {
          console.log("Sent!".yellow, "\nSubject:", emailSubject);
          if (cb) {
            cb();
          }
        });
      } else {
        if (cb) {
          cb();
        }
      }
    });
  });
});

/**
 * Post config to FCP
 */
gulp.task('push_prod', ['sdk'], function (cb) {
  var container = "production";
  BuildAndPushToEnv(container, function (fcpRes) {
    console.log("Do you want to send a code delivery email to yourself?".yellow, "(1 = yes, 0 = no)".magenta);
    fsGulpUtil.promptForValuesIfNeeded({
      sendCodeEmail: null
    }, function (res) {
      if (res.sendCodeEmail == 1) {
        var recipient = creds.username.substr(0, creds.username.indexOf('@')) + "@foresee.com";
        console.log("Sending delivery email to ".yellow + " " + recipient.magenta + "...");
        fsGulpUtil.sendClientCodeEmail(clientProperties.client.id, clientProperties.client.sitekey, recipient, container, fcpRes, function (emailSubject) {
          console.log("Sent!".yellow, "\nSubject: ", emailSubject);
          if (cb) {
            cb();
          }
        });
      } else {
        if (cb) {
          cb();
        }
      }
    });
  });
});

/**
 * Promote product configs from staging to production, will not promote feedback
 */
gulp.task('promote_prod', function (cb) {
  FcpClient.promptForFCPCredentials({
    notes: true
  }, function (rs) {
    var fcp = new FcpClient(rs.username, rs.password, rs.environment);
    fcp.promoteStgToProd(clientProperties.client.sitekey, rs.notes, ['trigger', 'record'], function (success, result) {
      console.log(result);
    });
  });
});



/*********************************************************************************************/
/*                                         REPORTING                                         */
/*********************************************************************************************/

/**
 * Generate a report of code versions for all clients/sites/containers
 */
gulp.task('code_version_report', ['_pullextern'], function (cb) {
  
  FcpClient.promptForFCPCredentials({}, function (rs) {
    //get instance of FcpClient
    const fcp = new FcpClient(rs.username, rs.password, rs.environment);
    
    //create progress bar
    // const ProgressBar = require('ascii-progress');
    
    // const bar = new ProgressBar({ 
    //   schema: '[:bar] :percent :elapseds/:etas'
    // });
    
    const bar = '';
    
    let schema = {
      properties: {}
    };
    
    schema.properties.email = {
      required: true,
      type: 'string'
    };
    
    prompt.start();
    console.log('Enter the email adresss you would like this report sent to...'.magenta);
    prompt.get(schema, function (err, result) {
      if (!err && emailValidator.validate(result.email)) {
        //get the current default code version then get this party started
        console.log('Generating report...'.magenta);
        getDefaultCodeVersion(fcp).then(function (codeVer) {
          listClients(fcp, bar, result.email, codeVer);
        });
      } else {
        console.log('Invalid email');
      }
    });
  });
  
  function getDefaultCodeVersion (fcp) {
    return new Promise(function (resolve, reject) {
      fcp.getDefaultConfig(function (success, data) {
        if (!success) {
          resolve('default');
        } else {
          resolve(data.codeVer);
        }
      });
    });
  }
  
  function listClients (fcp, bar, email, codeVer) {
    fcp.listClients(function (success, clients) {
      if (!success) {
        console.log("List clients error: ".red, clients);
      } else {
        
        //generating an array of functions that return promises
        const promiseFunctions = clients.map(function (client, i) {
          return function () {
            // bar.update(i/clients.length);
            
            return new Promise(function (resolve, reject) {
              let clientObj = {
                clientId: client.id,
                clientName: client.name,
                sites: []
              };
              
              listSitesForClient(fcp, codeVer, clientObj, resolve, reject);
              
            }); 
          };
        });
        
        //execute these promises for each client serially instead of in parallel
        //we are using this as a throttling mechanism (active directory service can get overwhelmed with too many concurrent auth requests)
        serial(promiseFunctions)
          .then(function (report) {
            sendReport(bar, email, report);
          })
          .catch(function (e) {
            console.log(e);
          });
        
        /*
         * serial executes Promises sequentially.
         * @param {funcs} An array of funcs that return promises
         */
        function serial (funcs) {
          return funcs.reduce((promise, func) => promise.then(result => func().then(Array.prototype.concat.bind(result))), Promise.resolve([]));
        }
      }
    });
  }
  
  function sendReport (bar, email, report) {
    // bar.update(1);
    var transport = mailer.createTransport(smtpTransport({
      host: "webmail.foreseeresults.com",
      port: 25,
      ignoreTLS: true
    }));
    
    var mailOptions = {
      from: 'no-reply@foresee.com',
      to: email,
      replyTo: 'no-reply@foresee.com',
      text: 'See attached report.json',
      subject: 'FCP - Clients Version Report',
      attachments: [
        {
          filename: 'report.json',
          content: JSON.stringify(report, null, 2),
          contentType: 'application/json'
        }
      ]
    };
    
    transport.sendMail(mailOptions, function (err, response) {
      if (!err) {
        console.log('Emailed report to: ', email);
      } else {
        console.log('Error sending report: ', err);
      }
      transport.close();
    });
  }
  
  function listSitesForClient (fcp, codeVer, clientObj, resolveClient, rejectClient) {
    const clientInfo = 'Client Name: "' + clientObj.clientName + '" Client ID:  "' + clientObj.clientId + '" ';
    fcp.listSitesForClient(clientObj.clientId, function (success, sites) {
      if (!success) {
        rejectClient(clientInfo + 'List Sites Error: ' + sites);
      } else {
        if (sites.length) {
          let sitePromises = sites.map(function (site) {
            return new Promise(function (resolve, reject) {
              let siteObj = {
                siteKey: site.name,
                containers: []
              };
              
              clientObj.sites.push(siteObj);
              
              listContainersForSite(fcp, codeVer, siteObj, resolve, reject);  
            });
          });
          
          Promise.all(sitePromises).then(function () {
            resolveClient(clientObj);
          }).catch(function (e) {
            console.log('Unable to retrieve client info: ' + clientInfo + e);
            resolveClient({});
          });
          
        } else {
          resolveClient(clientObj);
        }
      }
    });
  }
  
  function listContainersForSite (fcp, codeVer, siteObj, resolveSite, rejectSite) {
    fcp.getContainersForSitekey(siteObj.siteKey, function (success, containers) {
      if (!success) {
        rejectSite('List Containers For Site Key "' + siteObj.siteKey + '" Error: ' + containers);
      } else {
        if (containers.length) {
          
          let containerPromises = containers.map(function (container) {
            return new Promise(function (resolveContainer, rejectContainer) {
              
              let containerObj = {
                containerName: container.name,
                codeVersion: codeVer,
                products: []
              };
              
              siteObj.containers.push(containerObj);
              
              let getCodeVersion = new Promise(function (resolve, reject) {
                getCodeVersionForContainer(fcp, containerObj, siteObj.siteKey, resolve, reject);
              });
              
              let getProducts = new Promise(function (resolve, reject) {
                getProductsForContainer(fcp, containerObj, siteObj.siteKey, resolve, reject);
              });
              
              Promise.all([getCodeVersion, getProducts]).then(function () {
                resolveContainer();
              }).catch(function (e) {
                rejectContainer(e);
              });
              
            });
          });
          
          Promise.all(containerPromises).then(function () {
            resolveSite();
          }).catch(function (err) {
            rejectSite('Container error: ' + err);
          });
          
        } else {
          resolveSite();
        }
      }
    });
  }
  
  function getCodeVersionForContainer (fcp, containerObj, siteKey, resolve, reject) {
    fcp.listActiveConfigForSiteContainer(siteKey, containerObj.containerName, callback);
    
    function callback (success, data) {
      if (!success) {
        if (data === 'Config not found' || data === 'Active Config not found') {
          resolve();
        } else {
          reject('getCodeVersion Error: for siteKey "' + siteKey + '" container "' + containerObj.containerName + '": ' + data);
        }
      } else {
        containerObj.codeVersion = data.code_version;
        resolve();
      }
    }
  }
  
  function getProductsForContainer (fcp, containerObj, siteKey, resolve, reject) {
    fcp.getContainerForSitekey(siteKey, containerObj.containerName, callback);
    
    function callback (success, data) {
      if (!success) {
        reject('getProducts Error for siteKey "' + siteKey + '" container "' + containerObj.containerName + '": ' + data);
      } else {
        containerObj.products = data.products;
        resolve();
      }
    }
  }
});


/*********************************************************************************************/
/*                                         MISC TASKS                                        */
/*********************************************************************************************/

/**
 * Default task - list tasks
 */
gulp.task('default', function (cb) {
  console.log("List of tasks:".magenta);
  for (var tk in gulp.tasks) {
    if (tk.substr(0, 1) != '_') {
      console.log(" * ".grey + tk.toString().yellow);
    }
  }
});

/**
 * Upgrade an older template
 */
gulp.task('upgrade', function (cb) {
  console.log("Upgrade is not working yet in this version of client code template.".red);
  /*
   var upgrader = new Upgrader();
   upgrader.Upgrade(cb);*/
});