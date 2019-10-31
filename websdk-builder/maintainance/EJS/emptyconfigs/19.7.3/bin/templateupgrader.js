// Dependencies
var clr = require('colors'),
  fs = require('fs'),
  fsgutil = require('../bin/fsgulputils'),
  svnsync = require('node-svnsync'),
  prompt = require('prompt'),
  path = require('path'),
  extend = require('extend'),
  stripComments = require('strip-comments'),
  beautify = require('js-beautify').js_beautify,
  atob = require('atob'),
  btoa = require('btoa');

/**
 * Constructors
 * @constructor
 */
var Upgrader = function () {
};

/**
 * Start an upgrade
 * @param cb {Function} Callback
 * @constructor
 */
Upgrader.prototype.Upgrade = function (cb) {
  console.log("Template upgrader script".yellow + " - ".grey + " Should be run with sudo or Administrator access!".magenta);

  var rootDir = './_upgrade',
    username,
    password,
    svnlocation,
    ctx = this;

  // Debug
  /*username = "alexei.white";
  password = "Foresee2016";
  svnlocation = "https://codevault2.foreseeresults.com/implementation/Clients R/REI/trunk";
*/
  //username = "alexei.white";
  //password = "Foresee2016";
  //svnlocation = "http://codevault2.foreseeresults.com/implementation/Clients E/EMD_SERONO/MSLIFELINES.COM/trunk";

  if (!fs.existsSync('./clientconfig/foresee/surveydef/def1.js')) {
    console.log("Error. You are not dealing with a pristine template. Check it out fresh and try again!".red);
    cb();
    return;
  }

  // Clear the destination folder
  fsgutil.clearFolderIfExists(rootDir, function () {
    fs.mkdir(rootDir, function (e) {
      fsgutil.promptForValuesIfNeeded({
        username: username,
        password: password,
        repo: svnlocation
      }, function (vals) {
        svnsync({
          'dest': rootDir,
          'repo': vals.repo,
          'localfolder': 'code',
          'username': vals.username,
          'password': vals.password
        }, function (err) {
          if (err) {
            console.log("Error: ", err);
            return;
          }
          var dirs = fsgutil.getDirectories(rootDir + '/code'),
            actualDir = dirs[0],
            fullSrcPath = rootDir + '/code/' + actualDir,
            codeVersion = 0;

          console.log("Got files. Scanning for code version...".grey);

          if (!fsgutil.fileExistsSync(fullSrcPath + '/package.json')) {
            console.log("Client code version below 18x. Stopping...".red);
            codeVersion = 16;
            return;
          } else {
            codeVersion = 19;
            if (fsgutil.fileExistsSync(fullSrcPath + '/test.properties.js')) {
              codeVersion = 18;
            }
            console.log("Probable code version: ".yellow + " " + codeVersion.toString().magenta + "...".yellow);
            console.log("Working in ".grey + fullSrcPath.toString().grey + "...");

            if (codeVersion == 18) {
              ctx._upgrade18x(fullSrcPath);
            } else if (codeVersion == 19) {
              ctx._upgrade19x(fullSrcPath);
            }
          }
        });
      })
    });
  });
};

/**
 * The step number
 * @type {number}
 * @private
 */
Upgrader.prototype._step = 0;

/**
 * Log a step
 * @param step
 * @private
 */
Upgrader.prototype._logStep = function (step) {
  this._step++;
  console.log(("[" + this._step + "] ").magenta + " " + step.grey + "...".grey);
};

/**
 * Log a warning
 * @param step
 * @private
 */
Upgrader.prototype._logWarning = function (step) {
  this._step++;
  console.log(("[" + this._step + "] ").magenta + " " + step.red + "...".red);
};

/**
 * Upgrade from 18x
 * @param fullSrcPath
 * @private
 */
Upgrader.prototype._upgrade19x = function (fullSrcPath) {
  var ctx = this,
    debugMode = false,
    logoFile = "sitelogo.png",
    hasReplay = false;

  console.log("\n***************** Converting from 19x (<19.2) *****************".yellow);
  if (debugMode) {
    console.log("WORKING IN DEBUG MODE - NO FILES WILL BE MODIFIED!".yellow + '\n');
  } else {
    console.log('\n');
  }

  var oldpjson = JSON.parse(fs.readFileSync(fullSrcPath + '/package.json').toString('utf-8'));

  ctx._logStep("Verified template version to be " + oldpjson.version);

  if (oldpjson.version.toString().indexOf('19.2') > -1) {
    ctx._logWarning("Client code template version is too new! You don't need to upgrade this");
    return;
  }

  if (fsgutil.fileExistsSync(fullSrcPath + "/assets/sitelogo.gif") || fsgutil.fileExistsSync(fullSrcPath + "/assets/sitelogo.png")) {
    if (debugMode) {
      ctx._logStep("Would have moved customer logo file if we were not in debug mode");
      if (fs.existsSync(fullSrcPath + "/assets/sitelogo.gif")) {
        ctx._logStep("Would have moved customer logo file sitelogo.gif");
        logoFile = "sitelogo.gif";
      }

      if (fs.existsSync(fullSrcPath + "/assets/sitelogo.png")) {
        ctx._logStep("Would have moved customer logo file sitelogo.png");
        logoFile = "sitelogo.png";
      }
    } else {
      if (fs.existsSync(fullSrcPath + "/assets/sitelogo.gif")) {
        ctx._logStep("Moving customer logo file sitelogo.gif");
        logoFile = "sitelogo.gif";
        fsgutil.moveFileIfExists(fullSrcPath + "/assets/sitelogo.gif", './assets/foresee/sitelogo.gif');
      }

      if (fs.existsSync(fullSrcPath + "/assets/sitelogo.png")) {
        ctx._logStep("Moving customer logo file sitelogo.png");
        logoFile = "sitelogo.png";
        fsgutil.moveFileIfExists(fullSrcPath + "/assets/sitelogo.png", './assets/foresee/sitelogo.png');
      }
    }
  }

  if (fsgutil.fileExistsSync(fullSrcPath + "/clientconfig/client_properties.js")) {
    ctx._logStep("Converting client properties (client_properties.js)");
    var oprops = require('.' + fullSrcPath + '/clientconfig/client_properties.js'),
      nprops = require('../clientconfig/client_properties.js');
    ctx._logStep("Client code version was actually " + oprops.clientcode_version);
    nprops.client.id = oprops.client.id;
    nprops.client.replayid = oprops.client.replayid;
    nprops.client.siteid = oprops.client.siteid;
    nprops.client.uberid = oprops.client.uberid;
    var finalstr = "// Generated with client code converter\nmodule.exports = " + JSON.stringify(nprops, null, 2) + ";";
    if (fsgutil.fileExistsSync('./clientconfig/client_properties.js')) {
      if (!debugMode) {
        fs.writeFileSync('./clientconfig/client_properties.js', new Buffer(finalstr));
        ctx._logStep("Converted client properties (client id: " + nprops.client.id + ", replayid: " + nprops.client.replayid + ", siteid: " + nprops.client.siteid + ", uberid: " + nprops.client.uberid + ")");
      } else {
        ctx._logStep("Converted client properties (client id: " + nprops.client.id + ", replayid: " + nprops.client.replayid + ", siteid: " + nprops.client.siteid + ", uberid: " + nprops.client.uberid + ") but did not write to file system due to debug mode");
      }
    }

    hasReplay = oprops.client.replay_enabled;

    // cxReplay config
    if (hasReplay) {
      ctx._logStep("Detected that cxReplay was used");

      var orec = fs.readFileSync(fullSrcPath + '/clientconfig/record_config.js').toString('utf-8');
      if (orec.indexOf('var hasRecord = false;') > -1) {
        orec = orec.substr(0, orec.indexOf('var hasRecord = false;'));
      }

      if (!debugMode) {
        fs.writeFileSync('./clientconfig/cxreplay/product_config.js', orec);
        ctx._logStep("Converted cxReplay configuration");
      } else {
        ctx._logStep("Converted cxReplay configuration but did not write to disk due to debug mode");
      }
    }

    // Trigger config
    if (fsgutil.fileExistsSync(fullSrcPath + "/clientconfig/trigger_config.js")) {
      ctx._logStep("Converting trigger config");

      var tconf = fs.readFileSync(fullSrcPath + "/clientconfig/trigger_config.js").toString('utf-8');
      tconf = "_acsDefine = function() {}; _fsDefine = function() {};\n" + tconf;
      eval(tconf);
      tconf = triggerconfig;
      var sdefs = surveydefs;
      delete triggerconfig;
      delete surveydefs;
      delete _acsDefine;
      delete _fsDefine;

      if (tconf && sdefs) {
        var nconf = fs.readFileSync("./clientconfig/foresee/product_config.js").toString('utf-8');
        nconf = "_acsDefine = function() {}; _fsDefine = function() {};\n" + nconf;
        eval(nconf);
        nconf = triggerconfig;
        delete triggerconfig;
        delete _acsDefine;
        delete _fsDefine;

        ctx._logStep("Converting trigger_config to product_config");
        extend(true, nconf, tconf);

        var finalCfg = fsgutil.JSONStringifyWithRegexp(nconf);
        finalCfg = fsgutil.recodeRegexpFromString(finalCfg);
        finalCfg = atob('LyoqDQogKiBGb3JlU2VlIFRyaWdnZXIgQ29uZmlndXJhdGlvbiAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKg0KICovDQp2YXIgdHJpZ2dlcmNvbmZpZyA9IA==') + finalCfg + '\n' + atob('DQovKioNCiAqIFRoZSBTdXJ2ZXkgRGVmaW5pdGlvbihzKSAqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKioqKg0KICogTm90ZTogeW91IGRvIG5vdCBoYXZlIHRvIHJlLXNwZWNpZnkgYWxsIHBhcmFtZXRlcnMgaW4gZWFjaCBzdWJzZXF1ZW50IGRlZmluaXRpb24sDQogKiBvbmx5IHRoZSBvbmVzIHRoYXQgaGF2ZSBjaGFuZ2VkLiBQcm9wZXJ0aWVzIGFyZSBjb3BpZWQgZnJvbSBlYXJsaWVyIGRlZmluaXRpb25zIGRvd24NCiAqIHRvIGxhdGVyIG9uZXMgd2hlbiB0aGV5IGhhdmVuJ3QgYmVlbiBzcGVjaWZpZWQuDQogKi8NCi8qKg0KICogQHByZXNlcnZlDQogKiBAQFNWQ09ORklHX0dPRVNfSEVSRUBADQogKi8NCg0KLyoqDQogKiBBIGdlbmVyaWMgY29uZmlndXJhdGlvbiBtb2R1bGUgdGhhdCBvdGhlciBtb2R1bGVzIG1heSBpbmNsdWRlDQogKi8NCl9mc0RlZmluZSgndHJpZ2dlcmNvbmZpZycsIGZ1bmN0aW9uICgpIHsNCiAgLyoqDQogICAqIEV4cG9ydCBhbGwgdGhlIGNvbmZpZw0KICAgKi8NCiAgcmV0dXJuIHtjb25maWc6IHRyaWdnZXJjb25maWcsIHN1cnZleWRlZnM6IHN1cnZleWRlZnN9Ow0KfSk7');

        if (!debugMode) {
          fs.writeFileSync("./clientconfig/foresee/product_config.js", finalCfg);
          ctx._logStep("Writing trigger configuration");
        } else {
          ctx._logStep("Would have written trigger configuration but we are in debug mode");
        }

        ctx._logStep("Converting survey definitions (" + sdefs.length + " of them)");

        var finalDefs = [],
          odef = fs.readFileSync('./clientconfig/foresee/surveydef/def1.js').toString('utf-8');
        odef = "var DEFFY = " + odef + ";";
        eval(odef);
        var defTemplate = DEFFY;

        // Pull out a pristine copy of the desktop and mobile display settings
        var desktopDisplay = {},
          mobileDisplay = {};
        extend(true, desktopDisplay, defTemplate.display.desktop[0]);
        extend(true, mobileDisplay, defTemplate.display.mobile[0]);

        for (var g = 0; g < sdefs.length; g++) {
          var defInst = extend(true, {}, defTemplate);
          extend(true, defInst, sdefs[g]);
          for (var p = 0; p < defInst.display.desktop.length; p++) {
            extend(true, defInst.display.desktop[p].dialog, desktopDisplay.dialog);
          }
          for (var p = 0; p < defInst.display.mobile.length; p++) {
            extend(true, defInst.display.mobile[p].dialog, mobileDisplay.dialog);
          }
          var fname = "ndef" + (g) + ".js";
          if (!debugMode) {
            ctx._logStep("Writing survey definition " + fname);
            fs.writeFileSync('./clientconfig/foresee/surveydef/' + fname, "(" + fsgutil.recodeRegexpFromString(fsgutil.JSONStringifyWithRegexp(defInst)) + ")");
          } else {
            ctx._logStep("Would have written survey definition " + fname + " if not in debug mode");
          }
        }

        if (!debugMode) {
          fs.unlink('./clientconfig/foresee/surveydef/def1.js', function () {
          });
          ctx._logStep("Removed the template surveydef file");
        }

        ctx._logStep("Completed conversion");

      } else {
        ctx._logWarning("Had trouble reading the trigger_config file. Failed")
      }
    } else {
      ctx._logWarning("Could not find trigger config!! Failed")
    }
  }
};

/**
 * Upgrade from 18x
 * @param fullSrcPath
 * @private
 */
Upgrader.prototype._upgrade18x = function (fullSrcPath) {
  var ctx = this,
    debugMode = false,
    logoFile = "sitelogo.png";

  console.log("\n***************** Converting from 18x *****************".yellow);
  if (debugMode) {
    console.log("WORKING IN DEBUG MODE - NO FILES WILL BE MODIFIED!".yellow + '\n');
  } else {
    console.log('\n');
  }
  if (fsgutil.fileExistsSync(fullSrcPath + "/assets/sitelogo.gif") || fsgutil.fileExistsSync(fullSrcPath + "/assets/sitelogo.png")) {
    if (debugMode) {
      ctx._logStep("Would have moved customer logo file if we were not in debug mode");
    } else {

      if (fs.existsSync(fullSrcPath + "/assets/sitelogo.gif")) {
        ctx._logStep("Moving customer logo file sitelogo.gif");
        logoFile = "sitelogo.gif";
        fsgutil.moveFileIfExists(fullSrcPath + "/assets/sitelogo.gif", './assets/foresee/sitelogo.gif');
      }

      if (fs.existsSync(fullSrcPath + "/assets/sitelogo.png")) {
        ctx._logStep("Moving customer logo file sitelogo.png");
        logoFile = "sitelogo.png";
        fsgutil.moveFileIfExists(fullSrcPath + "/assets/sitelogo.png", './assets/foresee/sitelogo.png');
      }
    }
  }
  if (fsgutil.fileExistsSync(fullSrcPath + "/client.properties.js")) {
    ctx._logStep("Converting client properties (client.properties.js)");
    var oprops = require('.' + fullSrcPath + '/client.properties.js'),
      nprops = require('../clientconfig/client_properties.js');
    ctx._logStep("Client code version was actually " + oprops.client_code_tag);
    nprops.client.id = oprops.client.id;
    nprops.client.replayid = oprops.client.replayid;
    nprops.client.siteid = oprops.client.siteid;
    nprops.client.uberid = oprops.client.uberid;
    var finalstr = "// Generated with client code converter\nmodule.exports = " + JSON.stringify(nprops, null, 2) + ";";
    if (fsgutil.fileExistsSync('./clientconfig/client_properties.js')) {
      if (!debugMode) {
        fs.writeFileSync('./clientconfig/client_properties.js', new Buffer(finalstr));
        ctx._logStep("Converted client properties (client id: " + nprops.client.id + ", replayid: " + nprops.client.replayid + ", siteid: " + nprops.client.siteid + ", uberid: " + nprops.client.uberid + ")");
      } else {
        ctx._logStep("Converted client properties (client id: " + nprops.client.id + ", replayid: " + nprops.client.replayid + ", siteid: " + nprops.client.siteid + ", uberid: " + nprops.client.uberid + ") but did not write to file system due to debug mode");
      }
    }
    var prodcfg = fs.readFileSync('./clientconfig/foresee/product_config.js').toString('utf-8'),
      fsjs = fs.readFileSync(fullSrcPath + '/common/foresee.js').toString('utf-8');

    // Fix the bad stuff
    fsjs = fsjs.replace(/:[ ]*(\${[^\}]*})[ ]*,/g, ': \'$1\',').replace(/\$\{client\.acceptableorigins\}/g, '\'\${client.acceptableorigins}\'');

    // Remove the bottom stuff
    fsjs = fsjs.replace(/[\$]*FSR\.FSRCONFIG[ ]*=[ ]*\{\};/gi, '');

    // Strip top stuff
    fsjs = fsjs.substr(fsjs.indexOf('{'));

    if (fsjs.lastIndexOf(';') > -1) {
      fsjs = fsjs.substr(0, fsjs.lastIndexOf(';'));
    }

    // Final preparation
    fsjs = "(" + fsjs.replace('window.name', '\'\'') + ")";

    var triggerDelay = parseInt(fsgutil.regexMatchGroup(/triggerDelay[\W]*:[\W]*([0-9]*)[\W]*,/gi, 0, fsjs)),
      layout = fsgutil.regexMatchGroup(/layout[\W]*:[\W]*['"]([^'"]*)['"][\W]*,/gi, 'CENTERFIXED', fsjs),
      pools = fsgutil.regexMatchGroup(/pools[\W]*:[\W]*(\[[^\]]*\])[\W]*,/gi, '', fsjs),
      sites = fsgutil.regexMatchGroup(/sites[\W]*:[\W]*(\[[^\]]*\])[\W]*,/gi, '', fsjs),
      hasReplay = fsgutil.hasRegexMatch(/['"]*sessionreplay['"]*[\W]*:[\W]*true/gi, fsjs);

    // Trigger delay
    if (!isNaN(triggerDelay)) {
      prodcfg = prodcfg.replace(/triggerDelay[\W]*:[\W]*[0-9]*[\W]*,/gi, 'triggerDelay: ' + triggerDelay + ',');
      ctx._logStep("Converted trigger delay: " + triggerDelay + "ms");
    }
    // Sites
    if (sites.length > 0) {
      prodcfg = prodcfg.replace(/sites[\W]*:[\W]*\[[^\]]*\][\W]*,/gi, 'sites: ' + sites + ',');
      ctx._logStep("Converted sites block: " + fsgutil.compressJSString(sites));
    }
    // Pools
    if (pools.length > 0) {
      prodcfg = prodcfg.replace(/replay_pools[\W]*:[\W]*\[[^\]]*\][\W]*,/gi, 'replay_pools: ' + pools + ',');
      ctx._logStep("Converted pools block: " + fsgutil.compressJSString(pools));
    }
    // Replay
    if (hasReplay) {
      ctx._logStep("Replay discovered to be active. Converting");

      var replaycfg = fs.readFileSync('./clientconfig/cxreplay/product_config.js').toString('utf-8'),
        oldreplaycfg = fs.readFileSync(fullSrcPath + '/sessionrecord/config.js').toString('utf-8');

      oldreplaycfg = stripComments(oldreplaycfg);

      var staticBlockEls = fsgutil.regexMatchGroup(/staticBlockEls[\W]*:[\W]*{([^}]*)}[\W]*,/gi, '', oldreplaycfg),
        dynamicBlockEls = fsgutil.regexMatchGroup(/dynamicBlockEls[\W]*:[\W]*{([^}]*)}[\W]*,/gi, '', oldreplaycfg),
        staticVisibleEls = fsgutil.regexMatchGroup(/staticVisibleEls[\W]*:[\W]*{([^}]*)}[\W]*,/gi, '', oldreplaycfg),
        dynamicVisibleEls = fsgutil.regexMatchGroup(/dynamicVisibleEls[\W]*:[\W]*{([^}]*)}[\W]*,/gi, '', oldreplaycfg),
        assetBlockEls = fsgutil.regexMatchGroup(/assetBlockEls[\W]*:[\W]*{([^}]*)}[\W]*,/gi, '', oldreplaycfg),
        removeVisibilityEls = fsgutil.regexMatchGroup(/removeVisibilityEls[\W]*:[\W]*{([^}]*)}[\W]*,/gi, '', oldreplaycfg),
        obscureEls = fsgutil.regexMatchGroup(/obscureEls[\W]*:[\W]*{([^}]*)}[\W]*,/gi, '', oldreplaycfg);

      var platWindows = fsgutil.extractRegexBool(/platforms[\W]*:[\W]*{[^}]*windows['"]*:[\W]*([^,]*),/gi, false, oldreplaycfg),
        platMac = fsgutil.extractRegexBool(/platforms[\W]*:[\W]*{[^}]*mac['"]*:[\W]*([^,]*),/gi, false, oldreplaycfg),
        platLinux = fsgutil.extractRegexBool(/platforms[\W]*:[\W]*{[^}]*linux['"]*:[\W]*([^,]*),/gi, false, oldreplaycfg),
        platIpod = fsgutil.extractRegexBool(/platforms[\W]*:[\W]*{[^}]*ipod['"]*:[\W]*([^,]*),/gi, false, oldreplaycfg),
        platIpad = fsgutil.extractRegexBool(/platforms[\W]*:[\W]*{[^}]*pad['"]*:[\W]*([^,]*),/gi, false, oldreplaycfg),
        platIphone = fsgutil.extractRegexBool(/platforms[\W]*:[\W]*{[^}]*iphone['"]*:[\W]*([^,]*),/gi, false, oldreplaycfg),
        platAndroid = fsgutil.extractRegexBool(/platforms[\W]*:[\W]*{[^}]*android['"]*:[\W]*([^,]*),/gi, false, oldreplaycfg),
        platBlackberry = fsgutil.extractRegexBool(/platforms[\W]*:[\W]*{[^}]*blackberry['"]*:[\W]*([^,]*),/gi, false, oldreplaycfg),
        platWinphone = fsgutil.extractRegexBool(/platforms[\W]*:[\W]*{[^}]*winphone['"]*:[\W]*([^,]*),/gi, false, oldreplaycfg),
        platKindle = fsgutil.extractRegexBool(/platforms[\W]*:[\W]*{[^}]*kindle['"]*:[\W]*([^,]*),/gi, false, oldreplaycfg),
        platNook = fsgutil.extractRegexBool(/platforms[\W]*:[\W]*{[^}]*nook['"]*:[\W]*([^,]*),/gi, false, oldreplaycfg),
        platWince = fsgutil.extractRegexBool(/platforms[\W]*:[\W]*{[^}]*wince['"]*:[\W]*([^,]*),/gi, false, oldreplaycfg),
        platMobile = fsgutil.extractRegexBool(/platforms[\W]*:[\W]*{[^}]*mobile['"]*:[\W]*([^,]*),/gi, false, oldreplaycfg),
        platOther = fsgutil.extractRegexBool(/platforms[\W]*:[\W]*{[^}]*other['"]*:[\W]*([^,]*),/gi, false, oldreplaycfg);

      var svgCaptureEnabled = fsgutil.extractUntypedSetting("svgCaptureEnabled", oldreplaycfg),
        scrollEls = fsgutil.extractUntypedSetting("scrollEls", oldreplaycfg),
        domReadyDelay = fsgutil.extractUntypedSetting("domReadyDelay", oldreplaycfg),
        regexScrub = fsgutil.extractUntypedSetting("regexScrub", oldreplaycfg),
        lowFidelity = fsgutil.extractUntypedSetting("lowFidelity", oldreplaycfg),
        watchNodeList = fsgutil.extractUntypedSetting("watchNodeList", oldreplaycfg),
        shortenedDomRewrites = fsgutil.extractUntypedSetting("shortenedDomRewrites", oldreplaycfg),
        keepComments = fsgutil.extractUntypedSetting("keepComments", oldreplaycfg);

      replaycfg = fsgutil.settingReplace('layout', "'" + layout + "'", replaycfg);
      ctx._logStep("Set site layout to " + layout);

      // Pools
      if (pools.length > 0) {
        replaycfg = replaycfg.replace(/replay_pools[\W]*:[\W]*\[[^\]]*\][\W]*,/gi, 'replay_pools: ' + pools + ',');
        ctx._logStep("Converted pools block: " + fsgutil.compressJSString(pools));
      }

      // Device type support
      var deviceSupportObj = {
        desktop: platWindows && platMac,
        phone: platIphone,
        tablet: platIpad
      };
      replaycfg = replaycfg.replace(/\/\*device_type_support[^\/]*\//gi, 'device_type_support: ' + JSON.stringify(deviceSupportObj, null, 2) + ',');
      ctx._logStep("Read platform support settings and applied this to record config: " + fsgutil.compressJSString(JSON.stringify(deviceSupportObj)));

      // NOW remove comments
      replaycfg = stripComments(replaycfg);

      replaycfg = replaycfg.replace(/staticBlockEls[\W]*:[^,]*/i, "\nstaticBlockEls: {" + staticBlockEls + "}");
      ctx._logStep("Converted staticBlockEls: {" + fsgutil.compressJSString(staticBlockEls) + "}");

      replaycfg = replaycfg.replace(/dynamicBlockEls[\W]*:[^,]*/i, "\ndynamicBlockEls: {" + dynamicBlockEls + "}");
      ctx._logStep("Converted dynamicBlockEls: {" + fsgutil.compressJSString(dynamicBlockEls) + "}");

      replaycfg = replaycfg.replace(/staticVisibleEls[\W]*:[^,]*/i, "\nstaticVisibleEls: {" + staticVisibleEls + "}");
      ctx._logStep("Converted staticVisibleEls: {" + fsgutil.compressJSString(staticVisibleEls) + "}");

      replaycfg = replaycfg.replace(/dynamicVisibleEls[\W]*:[^,]*/i, "\ndynamicVisibleEls: {" + dynamicVisibleEls + "}");
      ctx._logStep("Converted dynamicVisibleEls: {" + fsgutil.compressJSString(dynamicVisibleEls) + "}");

      replaycfg = replaycfg.replace(/assetBlockEls[\W]*:[^,]*/i, "\nassetBlockEls: {" + assetBlockEls + "}");
      ctx._logStep("Converted assetBlockEls: {" + fsgutil.compressJSString(assetBlockEls) + "}");

      replaycfg = replaycfg.replace(/removeVisibilityEls[\W]*:[^,]*/i, "\nremoveVisibilityEls: {" + removeVisibilityEls + "}");
      ctx._logStep("Converted removeVisibilityEls: {" + fsgutil.compressJSString(removeVisibilityEls) + "}");

      replaycfg = replaycfg.replace(/obscureEls[\W]*:[^,]*/i, "\nobscureEls: {" + obscureEls + "}");
      ctx._logStep("Converted obscureEls: {" + fsgutil.compressJSString(obscureEls) + "}");

      replaycfg = fsgutil.settingReplace('svgCaptureEnabled', svgCaptureEnabled, replaycfg);
      ctx._logStep("Set site svgCaptureEnabled to " + svgCaptureEnabled.trim());

      replaycfg = fsgutil.settingReplace('scrollEls', scrollEls, replaycfg);
      ctx._logStep("Set site scrollEls to " + scrollEls.toString().trim() + " (null is OK)");

      replaycfg = fsgutil.settingReplace('domReadyDelay', domReadyDelay, replaycfg);
      ctx._logStep("Set site domReadyDelay to " + domReadyDelay.toString().trim() + 'ms');

      if (regexScrub) {
        replaycfg = fsgutil.settingReplace('regexScrub', regexScrub, replaycfg);
        ctx._logStep("Set site regexScrub to " + regexScrub.toString().trim());
      }

      if (lowFidelity) {
        replaycfg = fsgutil.settingReplace('lowFidelity', lowFidelity, replaycfg);
        ctx._logStep("Set site lowFidelity to " + lowFidelity.toString().trim());
      }

      if (watchNodeList) {
        replaycfg = fsgutil.settingReplace('watchNodeList', watchNodeList, replaycfg);
        ctx._logStep("Set site watchNodeList to " + watchNodeList.toString().trim());
      }

      if (shortenedDomRewrites) {
        replaycfg = fsgutil.settingReplace('shortenedDomRewrites', shortenedDomRewrites, replaycfg);
        ctx._logStep("Set site shortenedDomRewrites to " + shortenedDomRewrites.toString().trim());
      }

      if (keepComments) {
        replaycfg = fsgutil.settingReplace('keepComments', keepComments, replaycfg);
        ctx._logStep("Set site keepComments to " + keepComments.toString().trim());
      }

      // Final format
      replaycfg = stripComments(replaycfg);
      replaycfg = replaycfg.replace(/\s{2,}/g, ' ');
      replaycfg = beautify(replaycfg, { indent_size: 2 });

      // Write the file
      if (!debugMode) {
        fs.writeFileSync('./clientconfig/cxreplay/product_config.js', replaycfg);
        ctx._logStep("Wrote finished cxreplay product config file to file system");
      } else {
        ctx._logStep("Skipped writing finished cxreplay product config file due to debug mode");
      }
    }

    // Move on to trigger surveydef
    var oldsurveydef = fs.readFileSync(fullSrcPath + '/trigger/foresee_surveydef.js').toString('utf-8');
    oldsurveydef = stripComments(oldsurveydef);
    oldsurveydef = beautify(oldsurveydef);
    oldsurveydef = "var FSR = {CPPS: {set: function(){}}};\n" + oldsurveydef;
    oldsurveydef = oldsurveydef.replace(/FSR\.CPPS\.set\('cxreplayaws[^;]*;/g, '');
    var odef = eval(oldsurveydef);

    ctx._logWarning("Note: DID NOT convert events from /trigger/config.js due to basic incompatibility");

    // Move over basic properties
    if (FSR) {
      var props = FSR.properties;
      ctx._logStep("Converting FSR.properties");

      // Repeat days
      if (props.repeatdays) {
        prodcfg = prodcfg.replace(/repeatDays[^}]*}/gi, "repeatDays: {decline:" + props.repeatdays + ",accept:" + props.repeatdays + "}");
        ctx._logStep("Set repeatdays for accept and decline states to " + props.repeatdays);
      }

      // Warnings
      ctx._logWarning("Note: DID NOT convert alt cookies or language");

      if (props.invite) {
        var iprops = props.invite;

        // Assign the logo
        if (iprops.siteLogo) {
          logoFile = iprops.siteLogo;
          ctx._logStep("Affirmed logo image file to be " + logoFile);
        }

        // Invite exclude
        if (iprops.exclude) {
          prodcfg = prodcfg.replace(/inviteExclude[^}]*}/gi, "inviteExclude: " + fsgutil.JSONStringifyWithRegexp(iprops.exclude));
          ctx._logStep("Converted invite exclude: " + fsgutil.compressJSString(fsgutil.JSONStringifyWithRegexp(iprops.exclude)));
        }
      }

      // CPPS
      if (props.cpps) {
        prodcfg = prodcfg.replace(/cpps[\W]*:[\W]*{[\W]*\/\*[\d\w\W]*}\*\/[^}]*}/gi, "cpps: " + fsgutil.JSONStringifyWithRegexp(props.cpps));
        ctx._logStep("Found CPPS. Converted " + (Object.keys(props.cpps).length) + " cpps");
      }
    }

    // Convert the survey defs
    if (FSR.surveydefs) {
      var finalDefs = [],
        odef = fs.readFileSync('./clientconfig/foresee/surveydef/def1.js').toString('utf-8');

      odef = "var DEFFY = " + odef + ";";
      eval(odef);
      var defTemplate = DEFFY;

      for (var i = 0; i < FSR.surveydefs.length; i++) {
        var defObj = {},
          olddef = FSR.surveydefs[i],
          isMobile = false;

        extend(true, defObj, defTemplate);
        defObj.name = olddef.name;

        if (olddef.platform.toLowerCase() == 'tablet') {
          defObj.criteria.supportsTablets = true;
          defObj.criteria.supportsSmartPhones = false;
          defObj.criteria.supportsDesktop = false;
          isMobile = true;
          ctx._logStep("Survey definition #" + (i + 1) + " is a tablet definition. Converting");
        } else if (olddef.platform.toLowerCase() == 'phone') {
          defObj.criteria.supportsTablets = false;
          defObj.criteria.supportsSmartPhones = true;
          defObj.criteria.supportsDesktop = false;
          isMobile = true;
          ctx._logStep("Survey definition #" + (i + 1) + " is a phone definition. Converting");
        } else if (olddef.platform.toLowerCase() == 'mobile') {
          defObj.criteria.supportsTablets = true;
          defObj.criteria.supportsSmartPhones = true;
          defObj.criteria.supportsDesktop = false;
          isMobile = true;
          ctx._logStep("Survey definition #" + (i + 1) + " is a tablet and phone definition. Converting");
        } else {
          defObj.criteria.supportsTablets = false;
          defObj.criteria.supportsSmartPhones = false;
          defObj.criteria.supportsDesktop = true;
          ctx._logStep("Survey definition #" + (i + 1) + " is a desktop definition. Converting");
        }

        // Criteria
        if (olddef.criteria) {
          if (Array.isArray(olddef.criteria.sp)) {
            defObj.criteria.sp.reg = olddef.criteria.sp[0];
            defObj.criteria.sp.outreplaypool = olddef.criteria.sp[1];
          } else {
            defObj.criteria.sp.reg = olddef.criteria.sp;
          }
          defObj.criteria.lf = olddef.criteria.lf;
          ctx._logStep(" - Converted criteria object: " + fsgutil.compressJSString(fsgutil.JSONStringifyWithRegexp(olddef.criteria)));
        }

        // Apply cxReplay setting
        if (hasReplay) {
          defObj.cxRecord = true;
          ctx._logStep(" - Turned cxReplay on");
        }

        // Apply include
        if (olddef.include) {
          extend(true, defObj.include, olddef.include);
          ctx._logStep(" - Applying include rule: " + fsgutil.compressJSString(fsgutil.JSONStringifyWithRegexp(olddef.include)));
        }

        // Apply pop
        if (olddef.pop && olddef.pop.when) {
          if (olddef.pop.when == "now") {
            // IN SESSION
            for (var y = 0; y < defObj.display.desktop.length; y++) {
              defObj.display.desktop[y].inviteLogo = logoFile;
              defObj.display.desktop[y].trackerLogo = logoFile;
              defObj.display.desktop[y].inviteType = "INSESSION";
            }
            ctx._logStep(" - Setting def type to IN-SESSION (\"now\")");
          } else if (olddef.pop.when == "later") {
            // ON EXIT
            if (isMobile) {
              for (var y = 0; y < defObj.display.mobile.length; y++) {
                defObj.display.desktop[y].inviteLogo = logoFile;
                defObj.display.desktop[y].trackerLogo = logoFile;
                defObj.display.desktop[y].inviteType = "SMSEMAIL";
              }
              ctx._logStep(" - Setting def type to SMSEMAIL (\"later\")");
            } else {
              ctx._logStep(" - Setting def type to TRACKER (\"later\")");
            }
          }
        }

        // Add it to the list
        finalDefs.push(defObj);
      }

      if (!debugMode) {
        var defDir = './clientconfig/foresee/surveydef';

        for (var i = 0; i < finalDefs.length; i++) {
          var defstr = fsgutil.JSONStringifyWithRegexp(finalDefs[i]);
          defstr = beautify(defstr, { indent_size: 2 });
          defstr = fsgutil.recodeRegexpFromString(defstr);
          defstr = defstr.replace(/sitelogo.png/gi, logoFile);
          fs.writeFileSync('./clientconfig/foresee/surveydef/sdef' + i + '.js', "(" + defstr + ")");
        }
        ctx._logStep("Wrote finished surveydefs to file system");
        fs.unlink(defDir + '/def1.js');
        fs.writeFileSync('./clientconfig/foresee/product_config.js', prodcfg);
        ctx._logStep("Wrote finished surveydefs to file system");
      } else {
        ctx._logStep("Skipped writing finished surveydefs due to debug mode");
      }
    }

    ctx._logWarning("Note: no effort was made to translate any qualifier pages you may have set up");

    // Tidy up the trigger code product config file
    prodcfg = beautify(prodcfg, { indent_size: 2 });
    prodcfg = fsgutil.recodeRegexpFromString(prodcfg);

    // Write the file
    if (!debugMode) {
      fs.writeFileSync('./clientconfig/foresee/product_config.js', prodcfg);
      ctx._logStep("Wrote finished trigger code product config file to file system");
    } else {
      ctx._logStep("Skipped writing finished trigger code product config file due to debug mode");
    }

  }

};

/**
 * Expose it to the sky
 * @type {Upgrader}
 */
module.exports = Upgrader;