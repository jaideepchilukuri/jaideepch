var fs = require('fs'),
  archiver = require('archiver'),
  pjson = require('../package.json'),
  notifier = require('node-notifier'),
  restler = require('restler'),
  btoa = require('btoa'),
  atob = require('atob'),
  stripComments = require('strip-comments'),
  prompt = require('prompt'),
  clrs = require('colors'),
  rimraf = require('rimraf'),
  path = require('path');

var username,
  password;

var ctx = {};

/**
 * Signal a notification
 * @param title
 * @param msg
 */
ctx.signal = function (title, msg) {
  notifier.notify({
    'title': title || "Note:",
    'message': msg || ''
  });
};

/**
 * Get the list of folders
 * @param srcpath
 */
ctx.getDirectories = function (srcpath) {
  return fs.readdirSync(srcpath).filter(function (file) {
    return fs.statSync(path.join(srcpath, file)).isDirectory();
  });
};

/**
 * Move a file if it exists
 * @param fl
 * @param dest
 */
ctx.moveFileIfExists = function (fl, dest) {
  if (ctx.fileExistsSync(fl)) {
    var f = fs.readFileSync(fl);
    fs.writeFileSync(dest, f);
    return true;
  } else {
    return false;
  }
};

/**
 * Clear a folder if it exists
 */
ctx.clearFolderIfExists = function (fl, cb) {
  cb = cb || function () {
  };

  if (ctx.folderExistsSync(fl)) {
    // Yes it is
    rimraf(fl, function () {
      var tm = setInterval(function () {
        if (!ctx.folderExistsSync(fl)) {
          clearInterval(tm);
          cb();
        }
      }, 50);
    });
  } else {
    process.nextTick(cb);
  }
};

/**
 * Find a group
 * @param rule
 * @param _def
 * @param src
 */
ctx.regexMatchGroup = function (rule, _def, src) {
  var res = rule.exec(src);
  if (res && res.length > 0) {
    return res[1];
  }
  return _def;
};

/**
 * Extract a boolean
 * @param rules
 * @param _def
 * @param src
 */
ctx.extractRegexBool = function (rule, _def, src) {
  var res = ctx.regexMatchGroup(rule, '', src);
  if (res) {
    if (res.toLowerCase().trim() == 'true') {
      return true;
    } else {
      return false;
    }
  }
  return _def;
};

/**
 * Try to read a setting by name
 * @param sname
 * @param src
 */
ctx.extractUntypedSetting = function (sname, src) {
  var rx = new RegExp("['\"\\W]*" + sname + "['\"\\W]*:([^,]*),", "gi"),
    res = ctx.regexMatchGroup(rx, null, src);
  if (res == null) {
    rx = new RegExp("['\"\\W]*" + sname + "['\"\\W]*:([^}]*)}", "gi");
    res = ctx.regexMatchGroup(rx, null, src);
  }
  return res;
};

/**
 * Replace a setting
 */
ctx.settingReplace = function (sname, val, src) {
  var rx = new RegExp(sname + "[\W]*:([^,]*),", "gi"),
    res = ctx.regexMatchGroup(rx, null, src),
    outsrc = '',
    newval = '\n' + sname + ': ' + val + ',';
  if (res) {
    outsrc = src.replace(rx, newval);
    return outsrc;
  } else {
    rx = new RegExp(sname + "[\W]*:([^}]*)}", "gi");
    res = ctx.regexMatchGroup(rx, null, src);
    if (res) {
      outsrc = src.replace(rx, newval);
      return outsrc;
    } else {
      return src;
    }
  }
};

/**
 * Do a stringify but preserve regexp
 * @param obj
 * @constructor
 */
ctx.JSONStringifyWithRegexp = function (obj) {
  function replacer(key, value) {
    if (value instanceof RegExp)
      return ("__REGEXP " + btoa(value.toString()));
    if (value instanceof Function) {
      return "__FUNCT " + btoa(value.toString());
    }
    else
      return value;
  }

  return JSON.stringify(obj, replacer, 2);
};

/**
 * Restore regexes
 * @param str
 */
ctx.recodeRegexpFromString = function (str) {
  var nstr = str.replace(/\"__REGEXP ([^\"]*)\"/gi, function () {
    var fstr = atob(arguments[1]);
    return fstr;
  });
  nstr = nstr.replace(/\"__FUNCT ([^\"]*)\"/gi, function () {
    var fstr = atob(arguments[1]);
    return fstr;
  });
  return nstr;
};

/**
 * Is the regex present?
 * @param rule
 * @param src
 */
ctx.hasRegexMatch = function (rule, src) {
  var res = rule.exec(src);
  return res && res.index > -1;
};

/**
 * Compress a string containing JS
 * @param str
 */
ctx.compressJSString = function (str) {
  var outstr = str.replace(/[\n\r]/gi, '').replace(/\s+/g, " ");
  return outstr;
};

/**
 * Does a file exist
 * @param fl
 */
ctx.folderExistsSync = function (fl) {
  try {
    var stats = fs.lstatSync(fl);
    if (stats.isDirectory()) {
      return true;
    }
    return false;
  } catch (e) {
    return false;
  }
};

/**
 * Does a file exist
 * @param fl
 */
ctx.fileExistsSync = function (fl) {
  try {
    fs.statSync(fl);
    return true;
  } catch (e) {
    return false;
  }
};

/**
 * Prompt for values if needed
 * @param vals
 * @param res
 */
ctx.promptForValuesIfNeeded = function (vals, res) {
  vals = vals || {};
  var vkeys = Object.keys(vals);
  for (var i = 0; i < vkeys.length; i++) {
    if (vals[vkeys[i]]) {
      vkeys.splice(i--, 1);
    }
  }
  if (vkeys.length > 0) {
    prompt.get(vkeys, function (err, result) {
      for (var kl in result) {
        vals[kl] = result[kl];
      }
      res.call(this, vals);
    });
  } else {
    process.nextTick(function () {
      res.call(this, vals);
    })
  }
};

/**
 * Ask for credentials for foresee - used for only feedback and cxr now.
 * @param cb
 */
ctx.getForeseeCredentials = function (cb) {
  var schema = {
    properties: {
      username: {
        required: true
      },
      password: {
        hidden: true
      }
    }
  };
  console.info("Please enter your ForeSee credentials");
  prompt.start();
  prompt.get(schema, function (err, result) {
    if (!err) {
      console.info("Thanks, please wait...");
      if (!result.description) {
        cb(result.username, result.password);
      } else {
        cb(result.username, result.password, result.description);
      }
    }
  });
};

/**
 * Base 64 Encode
 * @param str
 * @returns {*}
 */
ctx.b64EncodeUnicode = function (str) {
  return btoa(encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function (match, p1) {
    return String.fromCharCode('0x' + p1);
  }));
};

/**
 * Base 64 Decode
 * @param str
 * @returns {string}
 */
ctx.b64DecodeUnicode = function (str) {
  return decodeURIComponent(Array.prototype.map.call(atob(str), function (c) {
    return '%' + ('00' + c.charCodeAt(0).toString(16)).slice(-2);
  }).join(''));
};

/**
 * Minify a string
 * @param str
 * @returns {XML|string|void|*}
 */
ctx.simpleMinifyJSString = function (str) {
  str = stripComments(str);
  str = str.replace(/\n/g, ' ');
  str = str.replace(/\s\s+/g, ' ');
  return str;
};

/**
 * Get the username and password
 * @param cb
 * @param desc
 */
ctx.getForeseeCredentials = function (cb) {
  var schema = {
    properties: {
      notes: {
        required: true
      },
      username: {
        required: true
      },
      password: {
        hidden: true,
        required: true
      },
      environment: {
        required: true,
        type: 'integer',
        message: '0 = dev, 1 = QA, 2 = QA2, 3 = prod'
      }
    }
  };
  console.log("Please enter your Foresee credentials. ".cyan);
  console.log("For environment, enter a number: " + "0 = dev".yellow + ", " + "1 = QA".magenta + ", " + "2 = QA2".magenta + ", " + "2 = prod".blue);
  prompt.start();
  prompt.get(schema, function (err, result) {
    if (!err) {
      if (result.username.indexOf('@') == -1) {
        result.username = result.username.trim() + '@aws.foreseeresults.com';
      }
      cb(result.username, result.password, result.environment, result.notes);
    }
  });
};

module.exports = ctx;