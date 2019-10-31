/**
 * Survey Admin class
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

/**
 * The Survey Admin class
 * @param browser
 * @constructor
 */
var Admin = function(browser) {
  this.browser = browser;
  this.stg = utils.getGeneralStorage(browser);
};

/**
 * Retrieve the template and stylesheet
 * @param cb (Function) callback on complete
 */
Admin.prototype.loadResources = function(cb) {
  this.stg.ready.subscribe(
    function() {
      var csslocation = fs.makeURI("$templates/trigger/admintools/main.css"),
        templatelocation = fs.makeURI("$templates/trigger/admintools/admin.html"),
        gotcss = false,
        gottemplate = false,
        check = function() {
          if (gotcss && gottemplate && cb) {
            cb();
          }
        };

      // Grab the CSS
      utils.loadCSS(
        csslocation,
        (function(ctx) {
          return function(linkel) {
            /* pragma:DEBUG_START */
            console.log("sva: got css");
            /* pragma:DEBUG_END */
            gotcss = true;
            check();
          };
        })(this),
        null,
        this.browser
      );

      // Grab the template
      var tr = new utils.JSONP({
        success: function(result) {
          /* pragma:DEBUG_START */
          console.log("sva: got template");
          /* pragma:DEBUG_END */
          gottemplate = true;
          this.template = result;
          check();
        }.bind(this),
      });
      tr.get(templatelocation, "templates_trigger_admintools_");
    }.bind(this),
    true,
    true
  );
};

/**
 * Apply any set values
 * @private
 */
Admin.prototype._applyValues = function() {
  var overrideobject = {
      sp: {},
      lf: {},
    },
    spvals = document.querySelectorAll(".acsSPOverride"),
    lfvals = document.querySelectorAll(".acsLFOverride"),
    i;
  for (i = 0; i < spvals.length; i++) {
    var spid = spvals[i].id,
      spval = spvals[i].value,
      realspid = spid.replace("_spovr_", "");
    if (spval && spval.length > 0) {
      overrideobject.sp[realspid] = {
        reg: parseInt(spval, 10),
        outreplaypool: parseInt(spval, 10),
      };
    }
  }
  for (i = 0; i < lfvals.length; i++) {
    var lfid = lfvals[i].id,
      lfval = lfvals[i].value,
      reallfid = lfid.replace("_lfovr_", "");
    if (lfval && lfval.length > 0) {
      overrideobject.lf[reallfid] = parseInt(lfval, 10);
    }
  }
  var pooloveride = false;
  if (document.getElementById("acsOverridePooling").checked) {
    pooloveride = true;
  }
  overrideobject.pooloverride = pooloveride;
  this.stg.set(
    "ovr",
    JSON.stringify(overrideobject),
    null,
    true,
    function() {
      this.writeMessage("Override saved.");
    }.bind(this)
  );
};

/**
 * Write a message
 * @param msg
 */
Admin.prototype.writeMessage = function(msg) {
  var msgfield = document.getElementById("fsMessage");
  clearTimeout(this.wmTimeout);
  if (msgfield) {
    msgfield.innerHTML = msg || "";
    this.wmTimeout = setTimeout(function() {
      msgfield.innerHTML = "";
    }, 3000);
  }
};

/**
 * Draw everything
 */
Admin.prototype.render = function() {
  document.title = "ForeSee Survey Administration Tool";
  var vrs = fs.ext(
    this.browser,
    {
      siteLogo: fs.config.staticUrl + "/logos/foresee/foresee.svg",
    },
    { defs: config.surveydefs }
  );
  var outstr = Templater(this.template, vrs);
  document.body.innerHTML = outstr;
  var setb = document.getElementById("acsSetValues");
  if (setb) {
    utils.Bind(
      setb,
      "click",
      function(e) {
        utils.preventDefault(e);
        this.stg.reset(
          function() {
            this._applyValues();
          }.bind(this),
          null,
          true
        );
      }.bind(this)
    );
  }
  var clearb = document.getElementById("acsClearValues");
  if (clearb) {
    utils.Bind(
      clearb,
      "click",
      function(e) {
        utils.preventDefault(e);
        this.stg.reset(
          function() {
            this.writeMessage("State cleared.");
          }.bind(this),
          function() {
            this.writeMessage("Failed to clear state.");
          }.bind(this)
        );
        var spsl = document.querySelectorAll(".acsSPOverride, .acsLFOverride");
        for (var p = 0; p < spsl.length; p++) {
          spsl[p].value = "";
        }
        document.getElementById("acsOverridePooling").checked = false;
      }.bind(this)
    );
  }
  var retbtw = document.getElementById("acsReturnToSite");
  if (retbtw) {
    utils.Bind(
      retbtw,
      "click",
      function(e) {
        utils.preventDefault(e);
        var wloc = window.location.href + "";
        window.location = wloc.substr(0, wloc.indexOf("#"));
      }.bind(this)
    );
  }
  var ckovr = this.stg.get("ovr");

  if (ckovr) {
    ckovr = JSON.parse(ckovr);
    document.getElementById("acsOverridePooling").checked = ckovr.pooloverride;
    for (var spel in ckovr.sp) {
      try {
        document.getElementById("_spovr_" + spel).value = ckovr.sp[spel].reg;
      } catch (e) {}
    }
    for (var lfel in ckovr.lf) {
      try {
        document.getElementById("_lfovr_" + lfel).value = ckovr.lf[lfel];
      } catch (e) {}
    }
  }
};
