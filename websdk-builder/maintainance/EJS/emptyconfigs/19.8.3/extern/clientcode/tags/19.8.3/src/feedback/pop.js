/**
 * Pops the survey in a new window
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

/**
 * Pops a survey in a new window
 * @param survey
 * @constructor
 */
var Pop = function(survey, cfg, browser) {
  this.height = 600;
  this.width = 400;
  this.survey = survey;
  this.cfg = cfg;
  this.cpps = survey.cpps;
  this.SurveySubmitted = new utils.FSEvent();
  this.br = browser;
  this.jrny = cfg.jrny;
  this.networkError = utils.FSEvent();
};

/**
 * Pass along any relevant CxReplay parameters
 * @private
 */
Pop.prototype._getCXRParams = function() {
  var fstr = "";
  // Do cxReplay session ID's only if we're not in blacklist mode
  if (this.cfg.replay === true && typeof _recordController !== "undefined") {
    fstr +=
      "cxrid=" + fs.enc(_recordController.getGlobalId()) + "&cxrurl=" + fs.enc(fs.config.recUrl);
  }
  return fstr;
};

/**
 * Start a new window
 */
Pop.prototype.show = function() {
  if (!this.winRef) {
    // Since instances are attached to the url we want to minimize the number of instances
    // we are doing this with getBadgeConfig
    var _getBadgeConfig = function(btnMid, configObj) {
      var configObjCopy = fs.ext({}, configObj);
      for (var i = 0; i < configObjCopy.instances.length; i++) {
        if (btnMid === configObjCopy.instances[i].mid) {
          // get the difference between this config and the default one
          configObjCopy.instances = [configObjCopy.instances[i]];
          break;
        }
      }
      return configObjCopy;
    };

    var cppo = !!this.cfg.preview ? null : JSON.stringify(this.cpps.all());
    var cxrStr = this._getCXRParams();
    var ctx = this;
    var wref = window;
    // A survey can be opened from a badge or a call to FSR.launchFeedback()
    var mid =
      this.cfg.badge && this.cfg.badge.btncfg && this.cfg.badge.btncfg.mid
        ? this.cfg.badge.btncfg.mid
        : this.cfg.mid;
    var generalConfig = {
      global: fs.config,
      product: !!this.cfg.preview ? null : _getBadgeConfig(mid, Singletons.config),
    };

    // Preparing the URL for the survey

    // Survey's information used for both the preview and the normal mode
    var inf = [
      "&_gwl_=",
      fs.enc(fs.home),
      "&_cv_=",
      fs.enc(fs.config.codeVer),
      "&_au_=",
      fs.enc(fs.config.analyticsUrl),
      "&_vt_=",
      fs.enc(fs.tagVersion),
      "&_issh_=",
      fs.enc(fs.isSelfHosted),
      "&_pa_=",
      fs.enc(fs.assetLocation),
      !!fs.codeLocation ? "&_cl_=" + fs.enc(fs.codeLocation) : "",
    ].join("");

    var url;

    if (this.cfg.preview) {
      // Survey's information specific to the preview mode
      url = fs.makeURI(
        [
          "$fs.feedbacksurvey.html?mid=",
          fs.enc(this.survey.cfg.mid),
          "&t=",
          fs.enc(this.cfg.template || "default"),
          "&datauri=",
          fs.getParam("datauri"),
          "&ns=",
          fs.enc("preview"),
          "&_gcfg_=",
          fs.enc(
            utils.Compress.compress(
              // Extra fs.enc to make UTF8 survives compression
              fs.enc(JSON.stringify(generalConfig))
            )
          ),
          inf,
        ].join("")
      );
    } else {
      // Survey's information specific to the normal mode
      url = fs.makeURI(
        [
          "$fs.feedbacksurvey.html?",
          "&t=",
          fs.enc(this.cfg.template || "default"),
          "&fsUrl=",
          fs.enc(wref.location.href),
          "&uid=",
          fs.enc(Singletons.stg.uid),
          "&ns=",
          fs.enc(fs.config.siteKey),
          "&brain=",
          fs.enc(fs.config.brainUrl),
          inf,
          "&",
          cxrStr,
        ].join("")
      );

      // To keep the URL as short as possible, some information is passed to the brain.
      var brain = utils.getBrainStorage(
        this.br,
        Singletons.stg.uid,
        this.cfg.preview ? "preview" : fs.config.siteKey
      );

      brain.set("fscfg", {
        gcfg: fs.enc(
          utils.Compress.compress(
            // extra fs.enc to make UTF8 survives compression
            fs.enc(JSON.stringify(generalConfig))
          )
        ),
        cid: fs.enc(fs.config.customerId),
        mid: mid,
        cpps: fs.enc(utils.Compress.compress(cppo)),
      });
    }

    if (this.br.isIE && this.br.browser.actualVersion <= 11) {
      // FORCE https (needed for ie and mob)
      if (url.substr(0, 2) == "//") {
        url = "https:" + url;
      }
      if (url.substr(0, 4) == "http") {
        url.replace("http", "https");
      }
    }

    /* pragma:DEBUG_START */
    if (url.length > 2083) {
      console.error("This URL is too long for IE11 !", url);
    }
    /* pragma:DEBUG_END */

    // If this is preview and we're in an iFrame..
    if (
      !!this.cfg.preview &&
      (wref !== wref.top || wref.location.toString().indexOf("fscommand=feedbackpreview") > -1)
    ) {
      wref.location.href = url;
    } else {
      this.winRef = wref.open(url, "_system");
      this._checkerFailsAllowed = 20; // *500ms
      this._checker = setInterval(function() {
        try {
          var hsh = ctx.winRef.location + "",
            locm = "fsSurveyComplete=";

          if (hsh.indexOf(locm) > -1) {
            clearInterval(ctx._checker);
            var fsData = utils.Compress.decompress(
              decodeURIComponent(hsh.substr(hsh.indexOf(locm) + locm.length))
            );
            Singletons.onFeedbackSubmitted.fire(JSON.parse(fsData));
            ctx.SurveySubmitted.fire(JSON.parse(fsData));
          }
        } catch (e) {
          // While the popup is open & loading, the browser may throw CORS error
          // upon accessing winRef.location.
          // This gives it some chances to succeeded.
          if (ctx._checkerFailsAllowed > 0) {
            ctx._checkerFailsAllowed--;
            return;
          }
          clearInterval(ctx._checker);
          ctx.SurveySubmitted.fire();
        }
      }, 500);
    }
  }
  Singletons.onFeedbackShown.fire(this.winRef);
};
