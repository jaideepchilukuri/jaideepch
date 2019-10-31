/**
 * Modal Dialog
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.Modal");

fs.require("fs.Top");
fs.require("fs.Dom.MiniDOM");
fs.require("fs.Loader");
fs.require("fs.Misc.Template");

(function () {

  /**
   * Defines a modal dialog
   * @param survey
   */
  var Modal = function (survey, browser, instconfig, errortemplate, modaltemplate, eptemplate) {
    this.sv = survey;
    this.cfg = survey.cfg;
    this.instcfg = instconfig;
    this.browser = browser;
    this.em = errortemplate;
    this.noserv = errortemplate;
    this.eptemplate = eptemplate;
    this.jrny = survey.cfg.jrny;
    this.add();
    this.modaltemplate = modaltemplate;
    this.cors = new utils.CORS(browser);
    this.sv.cfg.privacyuri = (!this.sv.cfg.privacyuri) ? "http://www.foresee.com/about-us/privacy-policy/" : this.sv.cfg.privacyuri;
    this.sv.cfg.privacytext = (!this.sv.cfg.privacytext) ? 'Privacy policy' : this.sv.cfg.privacytext;

    // Fires when a survey is submitted
    this.SurveySubmitted = new utils.FSEvent();
    // Fires on a network error
    this.networkError = new utils.FSEvent();

    var ctx = this;

    // Bind to the event that fires when a user begins submitting a survey
    this.sv.SubmitClicked.subscribe(
      fs.proxy(function () {
        this.$content.removeClass("acsVisible");
        this._showWait();
        utils.Healthy(this.browser, ["survey", "static"],
          fs.proxy(function () {
            this._postSurveyData(fs.proxy(function () {
              // Signal the event to the eventing server
              if (this.jrny) {
                this.jrny.addEventObj({
                  "name": 'feedback_submitted',
                  "properties": {
                    "mid": [this.cfg.mid]
                  }
                });
              }
              this.$content.addClass("acsVisible");
              this._showThankyou();
              this.SurveySubmitted.fire();
              this._removeWait();
            }, this));
          }, this),
          fs.proxy(function () {
            if (!this.networkError.didFire) {
              this.networkError.fire({type: "postdata_failed"});
            }
          }, this)
        );
      }, this)
    );

    // Bind to the event that fires when a network error occurred
    this.networkError.subscribe(
      fs.proxy(function (obj) {
        this._removeWait();
        // Signal the event to the eventing server
        if (obj && !!obj.type) {
          if (this.jrny) {
            this.jrny.addEventObj({
              "name": 'feedback_survey_' + obj.type,
              "properties": {
                "mid": [this.cfg.mid]
              }
            });
          }
        } else {
          // Keeping this if the error is not covered in the code..
          if (this.jrny) {
            this.jrny.addEventObj({
              "name": 'feedback_server_error',
              "properties": {
                "mid": [this.cfg.mid]
              }
            });
          }
        }
        this.$content.innerHTML = Templater(this.noserv, this.survey);
        var h1s = this.$content.$("h1"),
          cbut = this.$content.$(".acs-close-button")[0],
          msg = this.$content.$(".acs-serviceunavailable__message")[0];
        if (obj.type === 'expired') {
          while (msg.firstChild) {
            msg.removeChild(msg.firstChild);
          }
          if (this.sv.cfg.fbexpiremessage) {
            msg.appendChild($('<p>' + this.sv.cfg.fbexpiremessage + '</p>'));
          } else {
            var st = this._unencodeHTML(this.sv.defaultCfg.expired);
            msg.appendChild($(st));
          }
        } else {
          while (msg.firstChild) {
            msg.removeChild(msg.firstChild);
          }
          var str = this._unencodeHTML(this.sv.defaultCfg.unavailable);
          msg.appendChild($(str));
        }
        for (var p = 0; p < h1s.length; p++) {
          $(h1s[p]).addClass("acs-feedback__heading acs-feedback__heading--h1");
        }

        if (!this.cfg.preview) {
          this.positionModal();
          utils.Bind(cbut, "feedback:click", fs.proxy(function () {
            this.remove();
          }, this));
        }

        this.$content.addClass("acsVisible");
      }, this)
    );

    // Check health and then go grab the survey data...
    utils.Healthy(this.browser, ["survey", "static"],
      fs.proxy(function () {
        this._getSurveyData();
      }, this),
      fs.proxy(function () {
        if (!this.networkError.didFire) {
          this.networkError.fire({type: "getdata_failed"});
        }
      }, this)
    );
  };

  /**
   * Show the thankyou page
   * @private
   */
  Modal.prototype._showThankyou = function () {
    var res = Templater(this.eptemplate, this.survey);
    this.$content.innerHTML = res;
    var h1s = this.$content.$("h1"),
      cbut = this.$content.$(".acs-close-button")[0];
    for (var p = 0; p < h1s.length; p++) {
      $(h1s[p]).addClass("acs-feedback__heading acs-feedback__heading--h1");
    }
    this.positionModal();
    if (!this.cfg.preview) {
      utils.Bind(cbut, "feedback:click", fs.proxy(function () {
        this.jrny.addEventObj({
          "name": "feedback_thankyou_clicked",
          "properties": {
            "mid": [this.cfg.mid]
          }
        });
        this.remove();
      }, this));
    }
  };

  /**
   * Decodes HTML if necessary.
   * @private
   */
  Modal.prototype._unencodeHTML = function (str) {
    var lt = /&lt;/ig,
      gt = /&gt;/ig;
    return str.replace(lt, "<").replace(gt, ">");
  };

  /**
   * Show the wait image
   * @private
   */
  Modal.prototype._showWait = function () {
    this._removeWait();
    this._wait = new Loader();
    this.$el.appendChild(this._wait.$el);
    this._wait.center();
    var scroll = utils.getScroll(window),
      sz = utils.getSize(window);
    this._wait.$el.css({
      top: (scroll.y + ((sz.h - this._wait.$el.offsetHeight) / 2)) + 'px'
    });
  };

  /**
   * Remove the wait image
   * @private
   */
  Modal.prototype._removeWait = function () {
    if (this._wait) {
      this._wait.remove();
      this._wait = null;
    }
  };

  /**
   * Remove everything
   */
  Modal.prototype.remove = function () {
    if (this.$el && this.$el.parentNode) {
      this.$el.parentNode.removeChild(this.$el);
    }
  };

  /**
   * Add the modal to the page
   * @param win - window object to add the modal to
   */
  Modal.prototype.add = function (win) {
    // Get a reference to the window object
    win = win || window;

    var body = win.document.body,
      html = win.document.documentElement,
      height = Math.max(body.scrollHeight, body.offsetHeight, html.clientHeight, html.scrollHeight, html.offsetHeight),
      modalClass = "acsModalContainer--" + this.instcfg.template,
      cfg = this.sv.cfg,
      backFace = $("<div class=\"acsModalBackFace\"></div>"),
      chrome = $("<div class=\"acsModalChrome\"></div>");

    // CC-3039 add IE10 class for customizations
    if (this.browser.isIE && this.browser.browser.version == 10) {
      modalClass += ' acsIE10';
    }

    // Construct the modal element
    this.$el = $("<div class=\"" + modalClass + "\"></div>");
    this.$el.css({'height': height});

    if (!this.cfg.preview) {
      var ctx = this;
      utils.Bind(backFace, "feedback:click", fs.proxy(function (e) {
        // Only honor this request if we have the survey displayed or there was a network error
        if (this.survey || this.networkError.didFire) {
          // Signal the event to the eventing server
          if (ctx.jrny) {
            ctx.jrny.addEventObj({
              "name": "feedback_abandoned",
              "properties": {
                "mid": [cfg.mid]
              }
            });
          }
          // Network error, removing the modal, so that the next click triggers a new request.
          this.remove();
        }
      }, this));

      // Close on esc
      var escClbk = function (event) {
        if (event.keyCode == 27) {
          // Signal the event to the eventing server
          if (ctx.jrny) {
            ctx.jrny.addEventObj({
              "name": "feedback_abandoned",
              "properties": {
                "mid": [cfg.mid]
              }
            });
          }
          ctx.remove();
        }
        utils.Unbind(document.body, "feedback:keyup", escClbk);
      };
      utils.Bind(document.body, "feedback:keyup", escClbk);
      utils.Bind(chrome, "feedback:click", function (e) {
        var targ = e.target;
        if (targ && targ == chrome) {
          // Signal the event to the eventing server
          if (ctx.jrny) {
            ctx.jrny.addEventObj({
              "name": "feedback_abandoned",
              "properties": {
                "mid": [cfg.mid]
              }
            });
          }
          ctx.remove();
        }
      });
    }

    // Create the content holder and header
    var head = this.head = $("<div class=\"acsModalContent\"></div>"),
      mdlhead = $("<div class=\"acsModalHead\"></div>"),
      closebtn = $("<img src=\"" + fs.makeURI("$templates/feedback/" + (this.instcfg.template || 'default') + '/closeBtn.svg') + "\" class=\"acsModalCloseButton\">");

    this.$head = mdlhead;
    mdlhead.appendChild(closebtn);
    head.appendChild(mdlhead);

    // Create inner content
    this.$content = $("<div class=\"acsModalInnerContent\"></div>");

    // Append the elements to modal
    head.appendChild(this.$content);
    chrome.appendChild(head);
    this.$el.appendChild(backFace);
    this.$el.appendChild(chrome);

    // Add the modal to body
    var topContainer = win.document.body;
    topContainer.appendChild(this.$el);
    if (!this.cfg.preview) {
      utils.Bind(closebtn, "feedback:click", fs.proxy(function (e) {
        // Signal the event to the eventing server
        if (this.jrny) {
          this.jrny.addEventObj({
            "name": "feedback_abandoned",
            "properties": {
              "mid": [this.cfg.mid]
            }
          });
        }
        this.remove();
      }, this));
    }

    fs.nextTick(function () {
      backFace.addClass('_acsActive');
    });
    this._showWait();
  };

  /**
   * Add/Update content
   *
   */
  Modal.prototype.renderSurvey = function () {
    this._removeWait();
    this.$head.addClass("acsVisible");

    // Add in the answers logo url
    this.survey.ansLogoSrc = fs.makeURI("$p_b_foresee.svg");
    var res = Templater(this.modaltemplate, this.survey);
    this.$content.innerHTML = res;
    this.sv.bind(this.$content);
    this.positionModal();
    this.$content.addClass("acsVisible");
  };

  /**
   * Update the position of the modal
   */
  Modal.prototype.positionModal = function () {
    var scroll = utils.getScroll(window),
      sz = utils.getSize(window),
      mdlHeight = this.$content.offsetHeight || this.prevOffsetHeight,
      vl = Math.max(0, (scroll.y + ((sz.h - mdlHeight - 50) / 2))) + 'px';
    this.head.style.marginTop = vl;

    // Enforce special css to modalcontainer on *.peco.c* to avoid their restrictions on body tag for overflow.
    if (ACS_OVERRIDES && ACS_OVERRIDES.FBALTOVERFLOW) {
      this.$el.css({"overflow-y": "scroll", "display": "block"});
    }
  };

  /**
   * Reveal
   */
  Modal.prototype.show = function () {
    this.positionModal();
    this.$el.css({display: 'block'});
  };

  /**
   * Make a request to GET Survey data
   * @private
   */
  Modal.prototype._getSurveyData = function () {
    if (!this.sv.isExpired()) {
      /* pragma:DEBUG_START */
      console.warn("fb: getSurveyData. waiting for frame controller to be ready..");
      /* pragma:DEBUG_END */

      this.cors.ready.subscribe(fs.proxy(function () {
        /* pragma:DEBUG_START */
        console.warn("fb: frame controller ready. making ajax request..");
        /* pragma:DEBUG_END */

        var cfobj = {
          'mid': this.sv.cfg.mid,
          'cachebust': (new Date()).getTime()
        };

        if (this.sv.cfg.version) {
          cfobj.version = this.sv.cfg.version;
        }

        // Set a timer to simulate a timeout on the ajax request
        this._surveyTimer = setTimeout(fs.proxy(function () {
          /* pragma:DEBUG_START */
          console.warn("fb: timed out requesting data from the server");
          /* pragma:DEBUG_END */
          this.networkError.fire({type: 'timedout'});
        }, this), 10000);

        this.cors.send({
          url: this.sv.cfg.datauri,
          data: cfobj,
          method: 'GET',
          skipEncode: false,
          success: fs.proxy(function (res) {
            if (!this.networkError.didFire) {
              clearTimeout(this._surveyTimer);
              this.sv.SurveyData.fire(res, fs.proxy(function (data) {
                this.survey = data;
                this.renderSurvey();
              }, this));
            }
          }, this),
          failure: fs.proxy(function (res) {
            if (!this.networkError.didFire) {
              // Fire the network error event
              this.networkError.fire({type: 'getdata_failed'});
            }
          }, this)
        });
      }, this), true, true);
    } else {
      /* pragma:DEBUG_START */
      console.warn("fb: survey is expired..");
      /* pragma:DEBUG_END */
      this.networkError.fire({type: 'expired'});
    }
  };

  /**
   * Make a request to POST Survey data
   * @private
   * @param function callback to be called when POST is successful.
   */
  Modal.prototype._postSurveyData = function (cb) {
    // Don't do anything if we are in preview mode
    if (this.cfg.preview) {
      fs.nextTick(function () {
        if (cb) {
          cb();
        }
      });
      // Bomb out
      return;
    }

    var data = JSON.parse(this.sv._serialize());
    Singletons.onFeedbackSubmitted.fire(fs.ext({rating: this.sv._getScore()}, data));

    this._surveyTimer = setTimeout(fs.proxy(function () {
      /* pragma:DEBUG_START */
      console.warn("fb: timed out posting data to the server");
      /* pragma:DEBUG_END */
      this.networkError.fire({type: 'timedout'});
    }, this), 10000);

    // Post the data
    this.cors.send({
      method: "POST",
      url: this.cfg.posturi,
      data: data,
      contentType: 'application/json',
      success: fs.proxy(function (res) {
        clearTimeout(this._surveyTimer);
        if (cb) {
          cb();
        }
      }, this),
      failure: fs.proxy(function (res) {
        // Failure
        clearTimeout(this._surveyTimer);
        // Set a persistent value
        sessionStorage.setItem('acsFeedbackSubmitted', 'true');
        // Fire the network error event
        this.networkError.fire({type: 'postdata_failed'});
      }, this)
    });
  };
})();