/**
 * FullPage Survey Mode
 *
 * (c) Copyright 2016 ForeSee, Inc.
 *
 * @author Ani Pendakur (ani.pendakur@answers.com)
 * @author Ani Pendakur: ani.pendakur $
 *
 */

fs.provide("fs.FullPage");

fs.require("fs.Top");
fs.require("fs.Dom.MiniDOM");
fs.require("fs.Loader");
fs.require("fs.Misc.Template");

(function () {

  /**
   * Defines a FullPage Mode.
   * @param survey, browser, instconfig, errTemplate, svTemplate, epTemplate
   */
  var FullPageSurvey = function (survey, browser, cfg, errTemplate, svTemplate, epTemplate) {
    this.sv = survey;
    this.br = browser;
    this.cfg = cfg;
    this.jrny = cfg.jrny;
    this.errTemplate = errTemplate;
    this.svTemplate = svTemplate;
    this.epTemplate = epTemplate;
    this.$domContent = [];
    this.$btns = [];
    this.networkError = new utils.FSEvent();
    // Fires when a survey is submitted
    this.SurveySubmitted = new utils.FSEvent();
    this.cors = new utils.CORS(browser);
    var win = win || window,
      // Back up the dom
      childrn = win.document.body.childNodes;

    for (var i = 0; i < childrn.length; i++) {
      if (childrn[i].nodeType === 1 && $(childrn[i]).hasClass('_acs')) {
        this.$btns.push(childrn[i]);
      } else {
        this.$domContent.push(childrn[i]);
      }
    }

    this.$el = $("<div class=\"acsMainContainerFullPage--" + this.sv.cfg.template + "\"></div>");

    this.sv.cfg.privacyuri = (!this.sv.cfg.privacyuri) ? "http://www.foresee.com/about-us/privacy-policy/" : this.sv.cfg.privacyuri;
    this.sv.cfg.privacytext = (this.sv.cfg.privacytext) ? this.sv.cfg.privacytext : "Privacy policy";

    // Bind to the event that fires when a user begins submitting a survey
    this.sv.SubmitClicked.subscribe(function () {
      this.$content.removeClass("acsVisible");
      this._showWait();

      this._postSurveyData(function () {
        this.jrny.addEventObj({
          "name": "feedback_submitted",
          "properties": {
            "mid": [cfg.mid]
          }
        });
        this.$content.addClass("acsVisible");
        this._showThankyou();
        this._removeWait();
        this.SurveySubmitted.fire();
      }.bind(this));
    });

    // Bind to the event that fires when a network error occurred
    this.networkError.subscribe(this.onNetworkError.bind(this));

    this._getSurveyData(function (data) {
      this.survey = data;
      this.show();
    }.bind(this));
  };

  FullPageSurvey.prototype.onNetworkError = function (obj) {
    this._removeWait();
    // Signal the event to the eventing server
    if (obj && !!obj.type) {
      if (this.jrny) {
        this.jrny.addEventObj({
          "name": 'feedback_survey_' + obj.type,
          "properties": {
            "mid": [survey.cfg.mid]
          }
        });
      }
    } else {
      // Keeping this if the error is not covered in the code..
      if (this.jrny) {
        this.jrny.addEventObj({
          "name": 'feedback_server_error',
          "properties": {
            "mid": [survey.cfg.mid]
          }
        });
      }
    }
    this.$content = $("<div class=\"acsMainContainerMobile--" + this.sv.cfg.template + "\"></div>");
    this.$el = $("<div class=\"acsMainContainerFullPage--" + this.sv.cfg.template + "\"></div>");
    this.$closebtn = $("<span><img src=\"" + fs.makeURI("$templates/feedback" + (this.sv.cfg.template || 'default') + '/closeBtn.svg') + "\" class=\"acsModalCloseButton\"></span>");

    this.$content.innerHTML = Templater(this.errTemplate, this.survey);
    var msg = this.$content.$(".acs-serviceunavailable__message")[0];
    if (obj.type === 'expired') {
      while (msg.firstChild) {
        msg.removeChild(msg.firstChild);
      }
      if (this.sv.cfg.fbexpiremessage) {
        msg.appendChild($('<p>' + this.sv.cfg.fbexpiremessage + '</p>'));
      } else {
        msg.appendChild($('<p>This is an expired survey!</p>'));
      }
    } else {
      while (msg.firstChild) {
        msg.removeChild(msg.firstChild);
      }
      msg.appendChild($("<p>Feedback isn't available right now.</p><p>Please check back later.</p>"));
    }
    utils.Bind(this.$closebtn, "feedback:click", function () {
      this.hide(true);
    }.bind(this));

    this.$el.appendChild(this.$closebtn);
    this.$el.appendChild(this.$content);

    var okBtn = this.$el.$(".acs-close-button")[0];
    utils.Bind(okBtn, "feedback:click", function () {
      this.hide(true);
    }.bind(this));

    this.$content.addClass("acsVisible");

    // Rebuild the DOM with n/w error template.
    window.document.body.innerHTML = '';
    window.document.body.appendChild(this.$el);
  };

  /**
   * Replace all the dom and add the new dom (a loader to start with.)
   * Renders the survey in full page mode.
   * @private
   */
  FullPageSurvey.prototype._renderSurvey = function () {
    // Get a reference to the window object
    var win = win || window,
      cfg = this.sv.cfg,
      ctx = this,
      topContainer = win.document.body;

    if (!this.sv.cfg.preview) {
      // Close on esc
      var escClbk = function (event) {
        if (event.keyCode == 27) {
          // Signal the event to the eventing server
          ctx.jrny.addEventObj({
            "name": 'feedback_abandoned',
            "properties": {
              "mid": [ctx.cfg.mid]
            }
          });
          ctx.hide(false);
        }
        utils.Unbind(document.body, "feedback:keyup", escClbk);
      };
      utils.Bind(document.body, "feedback:keyup", escClbk);
    }

    // Hide everything and just show the survey.
    topContainer.innerHTML = '';
    // Only Append if they were not already appended.
    if (this.$el.children.length === 0) {
      // Create the content holder and header
      this.$closebtn = $("<span><img src=\"" + fs.makeURI("$templates/feedback/" + (this.sv.cfg.template || 'default') + '/closeBtn.svg') + "\" class=\"acsModalCloseButton\"></span>");

      // Create inner content
      this.$content = $("<div class=\"acsMainContainerMobile--" + this.sv.cfg.template + "\"></div>");

      this.$el.appendChild(this.$closebtn);
      this.$el.appendChild(this.$content);
    }
    topContainer.appendChild(this.$el);

    if (!this.sv.cfg.preview) {
      utils.Bind(this.$closebtn, "feedback:click", function () {
        this.hide(false);
      }.bind(this));
    }

    this._showWait();
  };

  /**
   * Show the wait image
   * @private
   */
  FullPageSurvey.prototype._showWait = function () {
    this._removeWait();
    this._wait = new Loader();
    this.$el.appendChild(this._wait.$el);
    this._wait.center();
    var scroll = utils.getScroll(window),
      sz = utils.getSize(window);
    // Absolutely position the loader as this is going to be all over the page.
    this._wait.$el.css({
      position: 'absolute',
      top: (scroll.y + ((sz.h - this._wait.$el.offsetHeight) / 2)) + 'px',
      left: (scroll.x + ((sz.w - this._wait.$el.offsetWidth) / 2)) + 'px'
    });
  };

  /**
   * Remove the wait image
   * @private
   */
  FullPageSurvey.prototype._removeWait = function () {
    if (this._wait) {
      this._wait.remove();
      this._wait = null;
    }
  };

  /**
   * Hides the survey and replaces the domcontent.
   * @param showbtn boolean - whether to show btns or not.
   */
  FullPageSurvey.prototype.hide = function (noBtns) {
    window.document.body.innerHTML = '';
    for (var i = 0; i < this.$domContent.length; i++) {
      window.document.body.appendChild(this.$domContent[i]);
    }

    // Exit feedback prompt
    if (this.jrny) {
      this.jrny.addEventObj({
        "name": 'feedback_abandoned',
        "properties": {
          "mid": [this.cfg.mid]
        }
      });
    }

    if (!noBtns) {
      this._showBtns();
    }
  };

  FullPageSurvey.prototype.remove = FullPageSurvey.prototype.hide;

  /**
   * Shows Buttons back.
   * @private
   */
  FullPageSurvey.prototype._showBtns = function () {
    for (var j = 0; j < this.$btns.length; j++) {
      window.document.body.appendChild(this.$btns[j]);
    }
  };

  /**
   * Renders and shows survey
   *
   */
  FullPageSurvey.prototype.show = function () {
    this._renderSurvey();
    this._removeWait();
    // Add in the answers logo url
    this.survey.ansLogoSrc = fs.makeURI("$p_b_foresee.svg");
    if (this.$content.children.length === 0) {
      var res = Templater(this.svTemplate, this.survey);
      this.$content.innerHTML = res;
      this.sv.bind(this.$content);
    }
    this.$content.addClass("acsVisible");
    this.$el.addClass("acsVisible");
    this.sv.SurveyUIUpdated.fire();

    // Signal the event to the eventing server
    if (this.jrny) {
      this.jrny.addEventObj({
        "name": 'feedback_survey_shown',
        "properties": {
          "mid": [this.sv.cfg.mid]
        }
      });
    }
  };

  /**
   * Shows the Thank you page..
   * @private
   */
  FullPageSurvey.prototype._showThankyou = function () {
    this._removeWait();
    var res = Templater(this.epTemplate, this.survey);

    this.$closebtn = $("<span><img src=\"" + fs.makeURI("$templates/feedback/" + (this.sv.cfg.template || 'default') + '/closeBtn.svg') + "\" class=\"acsModalCloseButton\"></span>");

    if (!this.sv.cfg.preview) {
      utils.Bind(this.$closebtn, "feedback:click", function () {
        this.hide(true);
      }.bind(this), true);
    }

    this.$content.innerHTML = res;

    if (this.jrny) {
      this.jrny.addEventObj({
        "name": 'feedback_thankyou_shown',
        "properties": {
          "mid": [this.cfg.mid]
        }
      });
    }

    // Remove the closebtn and content.
    this.$el.removeChild(this.$el.childNodes[0]);
    this.$el.removeChild(this.$el.childNodes[0]); // Yes, it's 0, not 1.

    // Add the closebtn and content.
    this.$el.appendChild(this.$closebtn);
    this.$el.appendChild(this.$content);

    var okBtn = this.$el.$(".acs-close-button")[0],
      h1s = this.$el.$("h1");

    for (var p = 0; p < h1s.length; p++) {
      $(h1s[p]).addClass("acs-feedback__heading acs-feedback__heading--h1");
    }
    if (!this.sv.cfg.preview) {
      utils.Bind(okBtn, "feedback:click", function () {
        this.hide(true);
      }.bind(this));
    }
  };
  /**
   * Make a request to GET Survey data
   * @private
   */
  FullPageSurvey.prototype._getSurveyData = function () {
    if (!this.sv.isExpired()) {
      /* pragma:DEBUG_START */
      console.warn("fb: using CORS to get survey data");
      /* pragma:DEBUG_END */

      var cfobj = {
        'mid': this.sv.cfg.mid,
        'cachebust': (new Date()).getTime()
      };

      if (this.sv.cfg.version) {
        cfobj.version = this.sv.cfg.version;
      }

      // Set a timer to simulate a timeout on the cors request
      this._surveyTimer = setTimeout(function () {
        /* pragma:DEBUG_START */
        console.warn("fb: timed out requesting data from the server");
        /* pragma:DEBUG_END */
        this.networkError.fire({ type: 'timedout' });
      }.bind(this), 10000);

      this.cors.send({
        method: "GET",
        url: this.cfg.datauri,
        data: cfobj,
        success: function (res) {
          clearTimeout(this._surveyTimer);
          this.sv.SurveyData.fire(res, function (data) {
            this.survey = data;
            this.show();
          }.bind(this));
        }.bind(this),
        failure: function (res) {
          this.networkError.fire({ type: 'getdata_failed' });
        }.bind(this)
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
  FullPageSurvey.prototype._postSurveyData = function (cb) {
    // Don't do anything if we are in preview mode
    if (this.sv.cfg.preview) {
      setTimeout(function () {
        if (cb) {
          cb();
        }
      }, 100);
      // Bomb out
      return;
    }

    this._surveyTimer = setTimeout(function () {
      /* pragma:DEBUG_START */
      console.warn("fb: timed out posting data to the server");
      /* pragma:DEBUG_END */
      this.networkError.fire({ type: 'timedout' });
    }.bind(this), 10000);

    // Post the data
    this.cors.send({
      method: "POST",
      url: this.cfg.posturi,
      data: JSON.parse(this.sv._serialize()),
      contentType: 'application/json',
      success: function (res) {
        clearTimeout(this._surveyTimer);
        if (cb) {
          cb();
        }
      }.bind(this),
      failure: function (res) {
        // Failure
        clearTimeout(this._surveyTimer);
        // Set a persistent value
        sessionStorage.setItem('acsFeedbackSubmitted', 'true');
        // Fire the network error event
        this.networkError.fire({ type: 'postdata_failed' });
      }.bind(this)
    });

  };
})();