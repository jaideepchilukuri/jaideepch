var clientProperties = require('../clientconfig/client_properties'),
  fs = require('fs'),
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
  path = require('path'),
  pjson = require('../package.json'),
  mailer = require('nodemailer'),
  smtpTransport = require('nodemailer-smtp-transport'),
  Entities = require('html-entities').AllHtmlEntities,
  entities = new Entities();

var username,
  password;

/**
 * Set up the exports
 */
module.exports = ( function () {
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
     * Send the email
     */
    ctx.sendClientCodeEmail = function (cid, clientkey, toEmail, container, fcpRes, cb) {
      /**
       * The HTML templater
       * @param str
       * @param data
       * @returns {*}
       */
      
      var Templater = function (str, data) {
        var fn;
        str = str || '';
        for (var dt in data) {
          var rgx = new RegExp("\\${" + dt + "}", "gi");
          str = str.replace(rgx, data[dt]);
        }
        return str;
      };
      var capitalizeFirstLetter = function (string) {
        return string.charAt(0).toUpperCase() + string.slice(1);
      };
      
      var mailConfig = pjson.email;
      var envList = ['dev', 'qa', 'qa2', 'stg'];
      var data = {
        version: pjson.code_version,
        tstamp: (new Date()).getTime(),
        client: clientkey,
        env: container,
        envCap: capitalizeFirstLetter(container),
        notProd: fcpRes.env === 4 ? '' : `(${envList[fcpRes.env]} - NOT PROD) `,
        cid: cid
      };
      var embedSnip = fs.readFileSync('./bin/embedsnippet.html').toString();
      var baseFcpUrl = fcpRes.frontEndEnvironment.replace(/https:/, '');
      var embedBackup = embedSnip + '';
      var stagingSnip = entities.encode(embedSnip.replace('${JSURL}', `${baseFcpUrl}/sites/${clientkey}/staging/gateway.min.js`)).replace(/\n/g, '<br>').replace(/[ ]{2}/g, '&nbsp;&nbsp;');
      var prodSnip = entities.encode(embedSnip.replace('${JSURL}', `${baseFcpUrl}/sites/${clientkey}/production/gateway.min.js`)).replace(/\n/g, '<br>').replace(/[ ]{2}/g, '&nbsp;&nbsp;');
      data.stagingembed = stagingSnip;
      data.productionembed = prodSnip;
      var template = fs.readFileSync('./bin/emailtemplate.html').toString();
      var mailBody = Templater(template, data);

      cb = cb || function () {
        };

      var transport = mailer.createTransport(smtpTransport({
        host: "webmail.foreseeresults.com",
        port: 25,
        ignoreTLS: true
      }));

      var subject = Templater(mailConfig.subject, data);
      var message = {
        from: mailConfig.from,
        to: toEmail,
        replyTo: mailConfig.replyto,
        html: mailBody,
        subject: subject
      };

      transport.sendMail(message, function (error, response) {
        transport.close();
        process.nextTick(cb, subject);
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
     * Does the array contain the value?
     * @param arr
     * @param val
     */
    ctx.arrayHasValue = function (arr, val) {
      arr = arr || [];
      for (var i = 0; i < arr.length; i++) {
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
    ctx.getClientId = function (callback) {
      console.log("Please provide the desired client ID from the DB:".yellow);
      prompt.get({
        clientid: {
          required: true
        }
      }, function (err, result) {
        if (err) {
          throw new Error("Failed");
        } else {
          callback(result.clientid);
        }
      });
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
     * Parse a gateway config file
     * @param fileloc
     */
    ctx.parseGWConfigFile = function (fileloc) {
      var fnameReg = /fs\.([a-zA-Z]*)\.js/gi,
        codever = clientProperties.clientcode_version,
        externprefix = './extern',
        codeversion = 1;

      if (fs.existsSync(externprefix + '/clientcode/' + codever + '/src/version.json')) {
        var vfile = fs.readFileSync(externprefix + '/clientcode/' + codever + '/src/version.json').toString();
        if (vfile) {
          vfile = JSON.parse(vfile);
          if (vfile && vfile.version) {
            codeversion = vfile.version;
          }
        }
      }

      var res = fs.readFileSync(fileloc).toString();
      res = res.replace(fnameReg, "fs.$1.v" + codeversion + ".js");

      return res;
    };

    /**
     * Used to Zip up the final result - used for only feedback and cxr now.
     */
    ctx.zipUp = function (cb, proj) {
      var fnameReg = /fs\.([a-zA-Z]*)\.js/gi,
        codever = clientProperties.clientcode_version,
        externprefix = './extern',
        codeversion = 1;

      if (fs.existsSync(externprefix + '/clientcode/' + codever + '/src/version.json')) {
        var vfile = fs.readFileSync(externprefix + '/clientcode/' + codever + '/src/version.json').toString();
        if (vfile) {
          vfile = JSON.parse(vfile);
          if (vfile && vfile.version) {
            codeversion = vfile.version;
          }
        }
      }

      if (!proj || !( proj === 'cxreplay' || proj === 'feedback')) {
        return false;
      }
      var cdate = new Date(),
        datestr = cdate.toDateString().toLowerCase().replace(/ /g, '_'),
        clientid = clientProperties.client.uberid.replace(/[^0-9a-zA-Z]/g, '').toLowerCase(),
        zipfilename = 'acs_' + proj + '_' + clientid + '_' + datestr + '.zip',
        outputPath = "./dist/" + zipfilename,
        srcDirectory = "./dist/" + proj,
        output = fs.createWriteStream(outputPath),
        zipArchive = archiver('zip');

      output.on('close', function () {
        console.info('Done with the zip ' + outputPath);
        if (cb) {
          cb(zipfilename);
        }
      });

      zipArchive.pipe(output);

      zipArchive.bulk([
        {src: ['**/*'], cwd: srcDirectory, expand: true}
      ]);

      zipArchive.append(null, {name: 'gateway/'});

      var gatewayconfig = fs.readFileSync(clientProperties.build.config + '/' + proj + '/gateway_config.js').toString('utf-8');
      gatewayconfig = gatewayconfig.replace(/\${versionTag}/gi, pjson.version);
      gatewayconfig = gatewayconfig.replace(/\${recTransporturl}/gi, clientProperties.client.transporturl);
      gatewayconfig = gatewayconfig.replace(fnameReg, "fs.$1.v" + codeversion + ".js");
      gatewayconfig = new Buffer(gatewayconfig, "utf-8");

      zipArchive.append(gatewayconfig, {name: 'gateway/snippet.js'});

      zipArchive.finalize(function (err, bytes) {
        if (err) {
          throw err;
        }
      });
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
      console.info("Please enter your credentials");
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
     * Reads FCP options from ~/env.json or environment variables
     * @returns options
     */
    ctx.readEnvVariables = function () {
      var home,
        ev,
        options = {};

      // Read FCP options from ~/env.json, if it exists
      try {
        home = process.env[(process.platform == 'win32') ? 'USERPROFILE' : 'HOME'];
        ev = JSON.parse(fs.readFileSync(home + '/env.json').toString());
        options.email = ev.FCP_EMAIL;
      } catch (e) {
      }
      // Read FCP options from environment variables, if they exist
      if (!options.email) {
        try {
          options.email = process.env.FCP_EMAIL;
        } catch (e) {
        }
      }
      return options;
    };
    return ctx;
  }
  ()
);