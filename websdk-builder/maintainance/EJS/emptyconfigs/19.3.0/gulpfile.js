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
  ncp = require('ncp').ncp;

// Fix the missing events URL if applicable
if (!clientProperties.client.events) {
  clientProperties.client.events = 'https://analytics.foresee.com/ingest/events';
}

// Insist on a minimum version of node
var _evner = process.version.toString().replace(/[v><=]/gi, ''),
  _mpver = pjson.engines.node.toString().replace(/[v><=]/gi, ''),
  resk = svcmp(_evner, _mpver);

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
  beautify = require('js-beautify').js_beautify,
  bufferize = require('gulp-bufferize'),
  concat = require('gulp-concat'),
  cssmin = require('gulp-cssmin'),
  exclude = require('gulp-ignore').exclude,
  extend = require('extend'),
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
  FcpClient = require('fcp-client'),
  zipdir = require('zip-dir');

// Set some defaults about what mode we are in
var isProd = false,
  isSSL = true;

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
  // If it's not a prod task
  if (taskName.indexOf('prod') === -1) {
    var transportUrl = clientProperties.client.transporturl;
    // If it's QA..
    if (transportUrl.indexOf('qa-rec.') === -1 && taskName.indexOf('qa') > -1) {
      clientProperties.client.transporturl = transportUrl.replace(/\/rec\./i, '/qa-rec.');
    }
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
    deps: ["$fs.utils.js", "$fs.survey.js", "gatewayconfig.min.js"]
  },
  "frame": {name: "Storage Frame", deps: ["fs.utils.js"]},
  "record": {name: "record", deps: ["$fs.utils.js", {'recordconfig': 'recordconfig'}]},
  "invite": {name: "Invitation Presenter Plugin", deps: ["$fs.utils.js", {'triggerconfig': 'config'}]},
  "trueconversion": {name: "True Conversion Plugin", deps: ["$fs.utils.js", {'triggerconfig': 'config'}]},
  "optout": {name: "Opt-Out Module", deps: ["$fs.utils.js", {'triggerconfig': 'config'}]},
  "svadmin": {name: "Survey Admin Module", deps: ["$fs.utils.js", {'triggerconfig': 'config'}]},
  "tracker": {name: "Tracker Window", deps: ["fs.utils.js"]},
  "trigger": {name: "Trigger", deps: ["$fs.utils.js", {'triggerconfig': 'config'}]}
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
  runSequence(['_templates', '_images', '_html', '_clientassets'], function () {
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
            staticUrl: clientProperties.client.static
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
          latency: 200,
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
        latency: 200,
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
      staticUrl: clientProperties.client.static
    };
    var gatewayfile = fs.readFileSync(pjson.build.extern + '/gateway/tags/' + pjson.gateway_version + '/dist/gateway.min.js').toString();
    var gatewaycfgfile = fs.readFileSync(pjson.build.extern + '/gateway/tags/' + pjson.gateway_version + '/dist/gatewayconfig.min.js').toString();
    var snippet = "productConfig.feedback = " + fsGulpUtil.parseGWConfigFile(pjson.build.config + '/productconfig/feedback/gateway_config.js') + ";";
    snippet = '_moduleLocationOverride = \'preview/code/' + pjson.code_version + '/\'; globalConfig = ' + JSON.stringify(globalConfig) + ';' + snippet;

    gatewayfile = gatewayfile.toString().replace(/\/\*\*[^@\/]*@preserve[^\[\/]*\[GENERAL_CONFIG\][^\/]*\//gi, snippet);
    gatewayfile = gatewayfile.toString().replace(/\${versionTag}/gi, pjson.version.toString());
    gatewaycfgfile = gatewaycfgfile.toString().replace(/\/\*\*[^@\/]*@preserve[^\[\/]*\[GENERAL_CONFIG\][^\/]*\//gi, snippet);
    gatewaycfgfile = gatewaycfgfile.toString().replace(/\${versionTag}/gi, pjson.version.toString());
    fs.writeFile("./preview/gateway.min.js", gatewayfile, function (err) {
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
    var didonce = false;
    ncp('./dist/code', './preview/code', function (err) {
      if (err) {
        return console.error(err);
      } else {
        if (!didonce) {
          didonce = true;
          console.log("Starting server on 8080...");
          process.nextTick(function () {
            handydevserver(
              8080,
              ['./preview', './smoketest'],
              {});
          });
        }
      }
    });
  });
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
  console.log("Client id can be 0 for auto-assign or non-zero number for a predefined ID.".yellow);
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
      if (isNaN(res.client_id)) {
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
        latest: true
      }, function (rs) {
        var fcp = new FcpClient(rs.username, rs.password, rs.environment);
        console.log("About to push code version..");
        fcp.postCodeVersion(buffer, rs.notes, pjson.version, rs.latest, function (success, data) {
          if (!success) {
            console.log("Did not succeed posting files".red, data);
          } else {
            console.log("Success:", data.toString().magenta);
          }
        });
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
    defCfg.alwaysOnLatest = 1;
    defCfg.brainUrl = clientProperties.client.brainurl;
    defCfg.recUrl = clientProperties.client.transporturl;
    defCfg.surveyUrl = clientProperties.client.surveyurl;
    defCfg.analyticsUrl = clientProperties.client.events;
    defCfg.staticUrl = clientProperties.client.static;

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
  defCfg.brainUrl = clientProperties.client.brainurl;
  defCfg.recUrl = clientProperties.client.transporturl;
  defCfg.surveyUrl = clientProperties.client.surveyurl;
  defCfg.analyticsUrl = clientProperties.client.events;
  defCfg.staticUrl = clientProperties.client.static;

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
 * Push the default config
 */
gulp.task('push_stg_config', ['_pullextern'], function (cb) {
  FcpClient.promptForFCPCredentials({}, function (rs) {
    var defCfg = getDefGlobalCfg(rs.environment);
    console.log("About to push a new default global configuration. Here it is:".magenta);
    console.log(defCfg);
    /**
     * Set up an instance of the FCP client
     * @type {FCPClient}
     */
    var fcp = new FcpClient(rs.username, rs.password, rs.environment);
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
  });
});

/**
 * Push the default config
 */
gulp.task('push_prod_config', ['_pullextern'], function (cb) {
  FcpClient.promptForFCPCredentials({}, function (rs) {
    var defCfg = getDefGlobalCfg(rs.environment);
    console.log("About to push a new default global configuration. Here it is:".magenta);
    console.log(defCfg);
    /**
     * Set up an instance of the FCP client
     * @type {FCPClient}
     */
    var fcp = new FcpClient(rs.username, rs.password, rs.environment);
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
      staticUrl: clientProperties.client.static
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

  FcpClient.promptForFCPCredentials({
    notes: true
  }, function (rs) {
    /**
     * Set up an instance of the FCP client
     * @type {FCPClient}
     */
    var fcp = new FcpClient(rs.username, rs.password, rs.environment, rs.notes);
    fcp.getClient(clientProperties.client.clientid, function (success, client) {
      if (!success) {
        console.log("Failed to connect to FCP.".red, client);
      } else {
        console.log(("Pushing code to " + (/push_prod/.test(taskName) ? "production" : " staging") + " for client " + clientProperties.client.clientid + ":").magenta, client.name.yellow, "on site key".magenta, clientProperties.client.sitekey.yellow, "...".magenta);
        console.log("Products being pushed:".magenta);
        if (globalConfig.products.record) {
          console.log("  * ", "record".yellow);
        }
        if (globalConfig.products.trigger) {
          console.log("  * ", "trigger".yellow);
        }
        if (globalConfig.products.feedback) {
          console.log("  * ", "will not push feedback (this should be done from the portal)".red);
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
            if (didPass) {
              if (cb) {
                cb();
              }
            }
          },
          didTrigger = false,
          didRecord = false;
        if (globalConfig.products.trigger) {
          if (!fs.existsSync(pjson.build.dist + '/trigger')) {
            fs.mkdirSync(pjson.build.dist + '/trigger');
          }
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
                });
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
                });
            }
          });
        }
      }
    });
  });
};

/**
 * Post code to FCP
 */
gulp.task('push_stg', ['sdk'], function (cb) {
  BuildAndPushToEnv("staging", function () {
    if (cb) {
      cb();
    }
  });
});
gulp.task('push_stg_debug', function (cb) {
  console.log("This task no longer makes sense. You probably want push_code_debug.".red);
  if (cb) {
    cb();
  }
});

/**
 * Post code to FCP
 */
gulp.task('push_prod', ['sdk'], function (cb) {
  BuildAndPushToEnv("production", function () {
    if (cb) {
      cb();
    }
  });
});
gulp.task('push_prod_debug', function (cb) {
  console.log("This task no longer makes sense. You probably want push_code_debug.".red);
  if (cb) {
    cb();
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