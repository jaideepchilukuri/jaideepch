/**
 * PopUp Window
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.PopWindow");

fs.require("fs.Top");
fs.require("fs.Dom.MiniDOM");
fs.require("fs.Loader");
fs.require("fs.Misc.Template");

(function () {

  /**
   * This is the JS file that gets included in a standalone window when the pop mode is set to a popup (ie: on mobile devices)
   * @param survey
   * @constructor
   */
  var PopWindow = function (configs, browser, jrny, mid, cppo, namespace, isstandalone) {
    /* pragma:DEBUG_START */
    console.log("fbs: setting up PopWindow with ", configs);
    /* pragma:DEBUG_END */
    // The survey mid is ge
    var cfg;

    this.isStandalone = isstandalone;
    // Get a CPPS instance
    this.cpps = new CPPS(namespace);
    this.networkError = new utils.FSEvent();
    if (cppo) {
      // if we are not using Stand Alone Survey
      if (!fs.isObject(cppo) && cppo.length > 2) {
        // Carry over any CPPS that were in the query string
        cppo = JSON.parse(utils.Compress.decompress(cppo));
      }
      for (var nk in cppo) {
        this.cpps.set(nk, cppo[nk]);
      }
    }

    // Keep track of the browser
    this.br = browser;

    // Did we submit the results?
    this.didSubmit = false;

    // tell the screen reader to announce changes to the content
    document.body.setAttribute("aria-live", "assertive");

    this.loader = new Loader();
    document.body.appendChild(this.loader.$el);

    if (configs && !!configs.instances && !!configs.instances.length) {
      // Find the config object for this survey
      for (var i = 0; i < configs.instances.length; i++) {
        if (configs.instances[i].mid == mid) {
          cfg = this.cfg = configs.instances[i];
          break;
        }
      }
    }

    if (typeof cfg === 'undefined' && (configs.preview || namespace === "preview")) {
      var datauri = fs.getParam('datauri'),
        tmpl = fs.getParam('template') || 'default';

      cfg = this.cfg = {
        mid: mid,
        datauri: datauri,
        posturi: "",
        reporturi: "",
        surveytype: "popup",
        autowhitelist: true,
        preview: true,
        template: tmpl,
        replay: false
      };
    }

    if (cfg) {
      var ctx = this,
        // CC-3039 add IE10 class for customizations
        ie10Class = browser.isIE && browser.browser.actualVersion == 10 ? ' acsIE10' : '';
      document.title = this.cfg.label;
      // Keep track of journey
      this.jrny = jrny;

      this.sv = new survey.SurveyBuilder(this.cfg, this.cpps, this.br);

      this.sv.cfg.privacyuri = (!this.sv.cfg.privacyuri) ? "http://www.foresee.com/about-us/privacy-policy/" : this.sv.cfg.privacyuri;
      this.sv.cfg.privacytext = (!this.sv.cfg.privacytext) ? 'Privacy policy' : this.sv.cfg.privacytext;


      // Set up the main content node
      this.$content = $("<div id=\"acsMainContentDialog\" class=\"acsMainContainerMobile--" + cfg.template + ie10Class + "\" role=\"dialog\" aria-labelledby=\"acsFeedbackDialogTitle\" aria-describedby=\"acsFeedbackDialogDesc\" aria-live=\"assertive\"></div>");

      // Bind to the event that fires when a network error occurred
      this.networkError.subscribe(function (obj) {
        if (ctx.jrny) {
          if (obj && !!obj.type) {
            // Keeping this if the error is not covered in the code..
            ctx.jrny.addEventObj({
              "name": "feedback_survey_" + obj.type,
              "properties": {
                "mid": [ctx.cfg.mid]
              }
            });
          } else {
            ctx.jrny.addEventObj({
              "name": "feedback_server_error",
              "properties": {
                "mid": [ctx.cfg.mid]
              }
            });
          }
        }
        this.renderError(obj.type);
      }.bind(this));

      this.initQ = new utils.Async(true, function () {
        /* pragma:DEBUG_START */
        console.warn("fbs: fetched CSS and error template.");
        /* pragma:DEBUG_END */
        this._getTemplatesAndRender();
      }.bind(this), function () {
        /* pragma:DEBUG_START */
        console.warn("fbs: failed fetching CSS or error template.");
        /* pragma:DEBUG_END */
        window.close();
      }.bind(this));

      this.initQ.enqueue(function (prom) {
        this._getCSS(prom);
      }.bind(this));

      this.initQ.enqueue(function (prom) {
        this._getTemplate('serviceunavailable', prom, function (template) {
          this.errTemplate = template;
        }.bind(this));
      }.bind(this));
    }

    // Before the window unloads, signal abandon
    utils.Bind(window, "unload", function () {
      if (!ctx.didSubmit && ctx.jrny) {
        // Signal the event to the eventing server
        ctx.jrny.addEventObj({
          "name": "feedback_abandoned",
          "properties": {
            "mid": [ctx.cfg.mid]
          }
        });
      }
    });
  };

  /*
   * Gets Survey, error and thank you templates.
   *
   */
  PopWindow.prototype._getTemplatesAndRender = function () {
    /* pragma:DEBUG_START */
    console.warn("fbs: getting templates.");
    /* pragma:DEBUG_END */
    var queue = new utils.Async(true, function () {
      /* pragma:DEBUG_START */
      console.warn("fbs: fetched ", this.sv.cfg.template, " templates.");
      /* pragma:DEBUG_END */
      this.renderSurvey();
    }.bind(this), function () {
      /* pragma:DEBUG_START */
      console.warn("fbs: failed fetching ", this.sv.cfg.template, " templates.");
      /* pragma:DEBUG_END */
      this.renderError();
    }.bind(this));

    queue.enqueue(function (prom) {
      // Go get the survey data
      this._getSurveyData(function (data) {
        this.survey = data;
        /* pragma:DEBUG_START */
        console.warn("fbs: fetched survey data.");
        /* pragma:DEBUG_END */

        prom.resolve();
      }.bind(this));
    }.bind(this));

    queue.enqueue(function (prom) {
      this._getTemplate('epilogue', prom, function (template) {
        this.epTemplate = template;
      }.bind(this));
    }.bind(this));

    queue.enqueue(function (prom) {
      this._getTemplate('surveycontents', prom, function (template) {
        this.svContentsTemplate = template;
      }.bind(this));
    }.bind(this));
  };
  /*
   * Get the css for the templates
   *
   */
  PopWindow.prototype._getCSS = function (prom) {
    /* pragma:DEBUG_START */
    console.log("fbs: getting css");
    /* pragma:DEBUG_END */
    utils.loadCSS(_fsNormalizeUrl("$templates/feedback/" + (this.sv.cfg.template || 'default') + '/main.css'),
      function (link) {
        if (link) {
          /* pragma:DEBUG_START */
          console.log("fbs: css loaded");
          /* pragma:DEBUG_END */
          prom.resolve();
        } else {
          prom.error();
        }
      },
      null, this.br);
  };

  /*
   * Grabs a template by making a jsonp call.
   * @private
   * @return Object
   * @param type what kind of template
   * @param prom promise to be resolved to signal the caller
   */
  PopWindow.prototype._getTemplate = function (type, prom, cb) {
    var tmp = (this.cfg.template || 'default'),
      url = _fsNormalizeUrl("$templates/feedback/" + tmp + '/' + type + '.html');

    // Make a call to get the error template
    var jp = new utils.JSONP({
      success: function (res) {
        cb(res);
        if (prom) {
          prom.resolve();
        }
      }.bind(this),
      failure: function (res) {
        if (prom) {
          /* pragma:DEBUG_START */
          console.warn("fbs: failed to fetch " + url);
          /* pragma:DEBUG_END */
          prom.error();
        }
      }.bind(this)
    });
    jp.get(url, 'templates_feedback_' + tmp + '_');
  };

  /**
   * Show the thankyou page
   * @private
   */
  PopWindow.prototype._showThankyou = function () {
    var ctx = this,
      res = Templater(this.epTemplate, this.survey);

    ctx.didSubmit = true;
    this.$content.innerHTML = res;
    var h1s = this.$content.$("h1");
    for (var p = 0; p < h1s.length; p++) {
      $(h1s[p]).addClass("acs-feedback__heading acs-feedback__heading--h1");
    }
    var cbut = this.$content.$(".acs-close-button")[0];

    if (("" + fs.getParam("ok")).indexOf("false") === 0) {
      // this is for mobile because the OK button does nothing
      cbut.style.display = "none";

      // and because the ok button had the margin, it looks funny
      // with the privacy links crammed against the status text
      // and you don't have any time to click on them anyway
      // so we are hiding them.
      this.$content.$(".acs-footer")[0].style.display = "none";
    } else {
      if (!this.cfg.preview) {
        utils.Bind(cbut, "click", function () {
          window.close();
        });
      }
    }

    // Hide the loader
    this.hideLoad();
  };

  /**
   * Hide the content and show the loading indicator
   */
  PopWindow.prototype.showLoad = function () {
    // announce when loading is finished
    document.body.setAttribute("aria-live", "assertive");
    document.getElementById("acsMainContentDialog").setAttribute("aria-live", "assertive");
    this.$content.css({ display: "none" });
    this.loader.center();
  };

  /**
   * Show the content and hide the loading indicator
   */
  PopWindow.prototype.hideLoad = function () {
    this.loader.moveOffScreen();
    if (utils.hasClass(this.loader.$el, "acs-loader")) {
      this.loader.$el.setAttribute("aria-hidden", true);
    }
    this.$content.css({ display: "block" });
    setTimeout(function () {
      // stop announcing changes because this causes issues when topics are selected,
      // and when typing in boxes. We only need this to announce the content when loading
      // finishes.
      document.body.removeAttribute("aria-live");
      document.getElementById("acsMainContentDialog").setAttribute("aria-live", "off");
    }, 1000);
  };

  /**
   * Add/Update content
   * @param $el
   */
  PopWindow.prototype.renderSurvey = function () {
    var ctx = this;
    // Signal the event to the eventing server

    // Remove the table
    var oldtb = $("#acsPleaseWaitTable")[0];
    oldtb.parentNode.removeChild(oldtb);

    // Make sure the role="dialog" points to the label and description of the modal properly
    this.survey.meta.prologuetext = this._addTitleDescIds(this.survey.meta.prologuetext);
    this.survey.meta.epiloguetext = this._addTitleDescIds(this.survey.meta.epiloguetext);

    // Add the logo src
    this.survey.ansLogoSrc = _fsNormalizeUrl("$p_b_foresee.svg");
    var res = Templater(this.svContentsTemplate, this.survey);
    this.$content.innerHTML = res;
    window.document.body.appendChild(this.$content);
    this.sv.bind(this.$content);

    if (ctx.jrny) {
      ctx.jrny.addEventObj({
        "name": "feedback_survey_shown",
        "properties": {
          "mid": [ctx.cfg.mid]
        }
      });
    }

    // Bind to when we start submitting
    this.sv.SubmitClicked.subscribe(function () {
      this.showLoad();
      // Signal the event to the eventing server
      if (ctx.jrny) {
        ctx.jrny.addEventObj({
          "name": "feedback_submitted",
          "properties": {
            "mid": [ctx.cfg.mid]
          }
        });
      }

      this._postSurveyData(function (success) {
        if (success) {
          if (!this.cfg.preview) {
            // Call processImmediate if required
            Replay.processImmediate();
          }
          // Show thankyou UI
          this._showThankyou();
        } else {
          this.networkError.fire({ type: 'postdata_failed' });
        }

        // for communicating with the mobile app
        window.surveycomplete = true;
        if (typeof fsrTracker != 'undefined') {
          fsrTracker.completeSurvey();
        }
      }.bind(this));
    }.bind(this));

    // Hide the loader
    this.hideLoad();
  };


  /**
   * This adds the acsFeedbackDialogTitle id to the first tag in the text,
   * and the acsFeedbackDialogDesc id to the remaining tags. This is to
   * allow the screen reader to announce what the role="dialog" is (label) and
   * why it's being presented (description) to the user separately.
   * @param {string} html
   */
  PopWindow.prototype._addTitleDescIds = function (html) {
    // parse the html
    var el = document.createElement("div");
    el.innerHTML = html;
    var titleTag = el.childNodes[0];
    var descTag = el.childNodes[1];
    var returnHTML = "";

    if (el.childNodes.length > 2) {
      el.removeChild(el.childNodes[0]);

      // we need to wrap the remaining nodes in a div
      descTag = document.createElement("div");
      descTag.setAttribute("style", "padding: 0; margin: 0;");
      while (el.hasChildNodes()) {
        var child = el.firstChild;
        el.removeChild(child);
        descTag.appendChild(child);
      }
    }

    titleTag.setAttribute("id", "acsFeedbackDialogTitle");
    returnHTML = titleTag.outerHTML;

    if (descTag) {
      descTag.setAttribute("id", "acsFeedbackDialogDesc");
      returnHTML += descTag.outerHTML;
    }

    return returnHTML;
  };

  /**
   * Show Error template
   * @param String type of error
   */
  PopWindow.prototype.renderError = function (type) {
    this.$content.innerHTML = Templater(this.errTemplate, this.sv);
    var msg = this.$content.$(".acs-serviceunavailable__message")[0];
    if (type === 'expired') {
      while (msg.firstChild) {
        msg.removeChild(msg.firstChild);
      }
      if (this.sv.cfg.fbexpiremessage) {
        msg.appendChild($('<p>' + this.sv.cfg.fbexpiremessage + '</p>'));
      } else {
        msg.appendChild($(this._unencodeHTML(this.sv.defaultCfg.expired)));
      }
    } else {
      while (msg.firstChild) {
        msg.removeChild(msg.firstChild);
      }
      msg.appendChild($(this._unencodeHTML(this.sv.defaultCfg.unavailable)));
    }
    document.body.appendChild(this.$content);
    var h3s = this.$content.$("h3");
    for (var p = 0; p < h3s.length; p++) {
      $(h3s[p]).addClass("acs-feedback__heading acs-feedback__heading--h1");
    }
    var cbut = this.$content.$(".acs-close-button")[0];

    if (!this.cfg.preview) {
      utils.Bind(cbut, "click", function () {
        window.close();
      });
    }

    this.hideLoad();
    var oldtb = $("#acsPleaseWaitTable")[0];
    if (oldtb) {
      oldtb.parentNode.removeChild(oldtb);
    }
  };
  /**
   * unencodes html when necessary.
   * @private
   */
  PopWindow.prototype._unencodeHTML = function (str) {
    var lt = /&lt;/ig,
      gt = /&gt;/ig;
    return str.replace(lt, "<").replace(gt, ">");
  };
  /**
   * GET the survey data.
   * @param function callback to be called when it's successful.
   * @private
   */
  PopWindow.prototype._getSurveyData = function (cb) {
    if (!this.sv.isExpired()) {
      // Set a timer to simulate a timeout on the ajax request
      this._surveyTimer = setTimeout(function () {
        /* pragma:DEBUG_START */
        console.warn("fbs: timed out requesting data from the server");
        /* pragma:DEBUG_END */
        this.networkError.fire({ type: 'timedout' });
      }.bind(this), 10000);
      // Make a call to get the data
      var SurveyDataRequest = new utils.AjaxTransport({
        url: this.cfg.datauri,
        method: "GET",
        success: function (res) {
          if (!this.networkError.didFire) {
            clearTimeout(this._surveyTimer);
            this.sv.SurveyData.fire(res, function (data) {
              if (cb) {
                cb(data);
              }
            }.bind(this));
          }
        }.bind(this),
        failure: function (res) {
          clearTimeout(this._surveyTimer);
          // Fire the network error event
          this.networkError.fire({ type: 'getdata_failed' });
        }.bind(this)
      });

      SurveyDataRequest.send({
        data: {
          'mid': this.cfg.mid,
          'cachebust': (new Date()).getTime(),
          'version': this.cfg.version
        }
      });
    } else {
      /* pragma:DEBUG_START */
      console.warn("fb: Survey is expired..");
      /* pragma:DEBUG_END */
      this.networkError.fire({ type: 'expired' });
    }
  };
  /**
   * Make a request to POST Survey data
   * @private
   * @param function callback to be called when POST is successful.
   */
  PopWindow.prototype._postSurveyData = function (cb) {
    // Don't do anything if we are in preview mode
    if (this.cfg.preview) {
      fs.nextTick(function () {
        if (cb) {
          cb(true);
        }
      });
      // Bomb out
      return;
    } else {
      this._surveyTimer = setTimeout(function () {
        /* pragma:DEBUG_START */
        console.warn("fb: timed out posting data to the server");
        /* pragma:DEBUG_END */
        this.networkError.fire({ type: 'timedout' });
      }.bind(this), 10000);
      var SurveyDataRequest = new utils.AjaxTransport({
        url: this.sv.cfg.posturi,
        method: "POST",
        success: function (res) {
          clearTimeout(this._surveyTimer);
          if (cb) {
            cb(true);
          }
        }.bind(this),
        failure: function (res) {
          clearTimeout(this._surveyTimer);
          // Set a persistent value
          sessionStorage.setItem('acsFeedbackSubmitted', 'true');
          if (cb) {
            cb(false);
          }
        }.bind(this)
      });

      var data = JSON.parse(this.sv._serialize()),
        tdata;

      // Push a CPP. Doing it this way won't add anything to storage
      if (fs.isArray(data.responses)) {
        data.responses.push({
          questionId: 'deployment_type',
          answerText: this.isStandalone ? "URL" : "BADGE"
        });
      }

      tdata = utils.Compress.compress(JSON.stringify(fs.ext({ rating: this.sv._getScore() }, data)));

      if (!this.isStandalone) {
        // Set the window hash
        window.location.hash = "fsSurveyComplete=" + encodeURIComponent(tdata);
      }

      // Post the data
      SurveyDataRequest.send({
        data: data,
        skipEncode: true,
        contentType: 'application/json'
      });
    }
  };
})();