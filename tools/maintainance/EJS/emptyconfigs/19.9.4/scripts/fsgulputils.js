/* eslint-env node */

const fs = require("fs");
const pjson = require("../package.json");
const notifier = require("node-notifier");
const btoa = require("btoa");
const atob = require("atob");
const stripComments = require("strip-comments");
const prompt = require("prompt");
const rimraf = require("rimraf");
const path = require("path");
const mailer = require("nodemailer");
const smtpTransport = require("nodemailer-smtp-transport");
const Entities = require("html-entities").AllHtmlEntities;
const entities = new Entities();

/**
 * Set up the exports
 */
module.exports = (function() {
  const ctx = {};

  /**
   * Signal a notification
   * @param title
   * @param msg
   */
  ctx.signal = function(title, msg) {
    notifier.notify({
      title: title || "Note:",
      message: msg || "",
    });
  };

  /**
   * Send the email
   */
  ctx.sendClientCodeEmail = function(cid, clientkey, toEmail, container, fcpRes, cb) {
    /**
     * The HTML templater
     * @param str
     * @param data
     * @returns {*}
     */

    const Templater = function(str, data) {
      str = str || "";
      for (const dt in data) {
        const rgx = new RegExp(`\\\${${dt}}`, "gi");
        str = str.replace(rgx, data[dt]);
      }
      return str;
    };
    const capitalizeFirstLetter = function(string) {
      return string.charAt(0).toUpperCase() + string.slice(1);
    };

    const mailConfig = pjson.email;
    const envList = ["dev", "qa", "qa2", "stg"];
    const data = {
      version: pjson.version,
      tstamp: new Date().getTime(),
      client: clientkey,
      env: container,
      envCap: capitalizeFirstLetter(container),
      notProd: fcpRes.env === 4 ? "" : `(${envList[fcpRes.env]} - NOT PROD) `,
      cid: cid,
    };
    const embedSnip = fs.readFileSync("./bin/embedsnippet.html").toString();
    const baseFcpUrl = fcpRes.frontEndEnvironment.replace(/https:/, "");
    const stagingSnip = entities
      .encode(
        embedSnip.replace("${JSURL}", `${baseFcpUrl}/sites/${clientkey}/staging/gateway.min.js`)
      )
      .replace(/\n/g, "<br>")
      .replace(/[ ]{2}/g, "&nbsp;&nbsp;");
    const prodSnip = entities
      .encode(
        embedSnip.replace("${JSURL}", `${baseFcpUrl}/sites/${clientkey}/production/gateway.min.js`)
      )
      .replace(/\n/g, "<br>")
      .replace(/[ ]{2}/g, "&nbsp;&nbsp;");
    data.stagingembed = stagingSnip;
    data.productionembed = prodSnip;
    const template = fs.readFileSync("./bin/emailtemplate.html").toString();
    const mailBody = Templater(template, data);

    cb = cb || function() {};

    const transport = mailer.createTransport(
      smtpTransport({
        host: "webmail.foreseeresults.com",
        port: 25,
        ignoreTLS: true,
      })
    );

    const subject = Templater(mailConfig.subject, data);
    const message = {
      from: mailConfig.from,
      to: toEmail,
      replyTo: mailConfig.replyto,
      html: mailBody,
      subject: subject,
    };

    transport.sendMail(message, function() {
      transport.close();
      process.nextTick(cb, subject);
    });
  };

  /**
   * Get the list of folders
   * @param srcpath
   */
  ctx.getDirectories = function(srcpath) {
    return fs.readdirSync(srcpath).filter(function(file) {
      return fs.statSync(path.join(srcpath, file)).isDirectory();
    });
  };

  /**
   * Move a file if it exists
   * @param fl
   * @param dest
   */
  ctx.moveFileIfExists = function(fl, dest) {
    if (ctx.fileExistsSync(fl)) {
      const f = fs.readFileSync(fl);
      fs.writeFileSync(dest, f);
      return true;
    } else {
      return false;
    }
  };

  /**
   * Clear a folder if it exists
   */
  ctx.clearFolderIfExists = function(fl, cb) {
    cb = cb || function() {};

    if (ctx.folderExistsSync(fl)) {
      // Yes it is
      rimraf(fl, function() {
        const tm = setInterval(function() {
          if (!ctx.folderExistsSync(fl)) {
            clearInterval(tm);
            return cb();
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
  ctx.regexMatchGroup = function(rule, _def, src) {
    const res = rule.exec(src);
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
  ctx.extractRegexBool = function(rule, _def, src) {
    const res = ctx.regexMatchGroup(rule, "", src);
    if (res) {
      if (res.toLowerCase().trim() == "true") {
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
  ctx.extractUntypedSetting = function(sname, src) {
    let rx = new RegExp(`['"\\W]*${sname}['"\\W]*:([^,]*),`, "gi"),
      res = ctx.regexMatchGroup(rx, null, src);
    if (res == null) {
      rx = new RegExp(`['"\\W]*${sname}['"\\W]*:([^}]*)}`, "gi");
      res = ctx.regexMatchGroup(rx, null, src);
    }
    return res;
  };

  /**
   * Replace a setting
   */
  ctx.settingReplace = function(sname, val, src) {
    let rx = new RegExp(`${sname}[W]*:([^,]*),`, "gi");
    let res = ctx.regexMatchGroup(rx, null, src);
    let outsrc = "";
    const newval = `\n${sname}: ${val},`;

    if (res) {
      outsrc = src.replace(rx, newval);
      return outsrc;
    } else {
      rx = new RegExp(`${sname}[W]*:([^}]*)}`, "gi");
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
  ctx.JSONStringifyWithRegexp = function(obj) {
    function replacer(key, value) {
      if (value instanceof RegExp) return `__REGEXP ${btoa(value.toString())}`;
      if (value instanceof Function) {
        return `__FUNCT ${btoa(value.toString())}`;
      } else return value;
    }

    return JSON.stringify(obj, replacer, 2);
  };

  /**
   * Restore regexes
   * @param str
   */
  ctx.recodeRegexpFromString = function(str) {
    let nstr = str.replace(/"__REGEXP ([^"]*)"/gi, function() {
      const fstr = atob(arguments[1]);
      return fstr;
    });
    nstr = nstr.replace(/"__FUNCT ([^"]*)"/gi, function() {
      const fstr = atob(arguments[1]);
      return fstr;
    });
    return nstr;
  };

  /**
   * Is the regex present?
   * @param rule
   * @param src
   */
  ctx.hasRegexMatch = function(rule, src) {
    const res = rule.exec(src);
    return res && res.index > -1;
  };

  /**
   * Compress a string containing JS
   * @param str
   */
  ctx.compressJSString = function(str) {
    const outstr = str.replace(/[\n\r]/gi, "").replace(/\s+/g, " ");
    return outstr;
  };

  /**
   * Does a file exist
   * @param fl
   */
  ctx.folderExistsSync = function(fl) {
    try {
      const stats = fs.lstatSync(fl);
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
  ctx.fileExistsSync = function(fl) {
    try {
      fs.statSync(fl);
      return true;
    } catch (e) {
      return false;
    }
  };

  /**
   * Does the array contain the value?
   * @param arr
   * @param val
   */
  ctx.arrayHasValue = function(arr, val) {
    arr = arr || [];
    for (let i = 0; i < arr.length; i++) {
      if (arr[i] == val) {
        return true;
      }
    }
    return false;
  };

  /**
   * Ask for a client ID
   * @param callback
   */
  ctx.getClientId = function(callback) {
    console.log("Please provide the desired client ID from the DB:".yellow);
    prompt.get(
      {
        clientid: {
          required: true,
        },
      },
      function(err, result) {
        if (err) {
          throw new Error("Failed");
        } else {
          return callback(result.clientid);
        }
      }
    );
  };

  /**
   * Prompt for values if needed
   * @param vals
   * @param res
   */
  ctx.promptForValuesIfNeeded = function(vals, res) {
    vals = vals || {};
    const vkeys = Object.keys(vals);
    for (let i = 0; i < vkeys.length; i++) {
      if (vals[vkeys[i]]) {
        vkeys.splice(i--, 1);
      }
    }
    if (vkeys.length > 0) {
      prompt.get(vkeys, function(err, result) {
        for (const kl in result) {
          vals[kl] = result[kl];
        }
        res.call(this, vals);
      });
    } else {
      process.nextTick(function() {
        res.call(this, vals);
      });
    }
  };

  /**
   * Ask for credentials for foresee - used for only feedback and cxr now.
   * @param cb
   */
  ctx.getForeseeCredentials = function(cb) {
    const schema = {
      properties: {
        username: {
          required: true,
        },
        password: {
          hidden: true,
        },
      },
    };
    console.info("Please enter your credentials");
    prompt.start();
    prompt.get(schema, function(err, result) {
      if (!err) {
        console.info("Thanks, please wait...");
        if (!result.description) {
          return cb(result.username, result.password);
        } else {
          return cb(result.username, result.password, result.description);
        }
      }
    });
  };

  /**
   * Base 64 Encode
   * @param str
   * @returns {*}
   */
  ctx.b64EncodeUnicode = function(str) {
    return btoa(
      encodeURIComponent(str).replace(/%([0-9A-F]{2})/g, function(match, p1) {
        return String.fromCharCode(`0x${p1}`);
      })
    );
  };

  /**
   * Base 64 Decode
   * @param str
   * @returns {string}
   */
  ctx.b64DecodeUnicode = function(str) {
    return decodeURIComponent(
      Array.prototype.map
        .call(atob(str), function(c) {
          return `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`;
        })
        .join("")
    );
  };

  /**
   * Minify a string
   * @param str
   * @returns {XML|string|void|*}
   */
  ctx.simpleMinifyJSString = function(str) {
    str = stripComments(str);
    str = str.replace(/\n/g, " ");
    str = str.replace(/\s\s+/g, " ");
    return str;
  };

  return ctx;
})();
