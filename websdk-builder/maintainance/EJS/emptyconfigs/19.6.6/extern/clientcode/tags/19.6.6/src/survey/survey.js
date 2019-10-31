/**
 * Survey Class
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */
fs.provide("sv.Survey");

fs.require("sv.SurveyUtils");
fs.require("sv.Dom.MiniDOM");
fs.require("sv.Loader");
fs.require("sv.TopicTester");
fs.require("sv.SurveyConfig");
fs.require("sv.Classes");
fs.require("sv.SurveyQuestion");
fs.require("sv.Classes.Star");
fs.require("sv.Classes.Radio");
fs.require("sv.Classes.CheckBox");
fs.require("sv.Classes.TextArea");
fs.require("sv.Classes.InputText");
fs.require("sv.Classes.Select");

(function () {
  /**
   * Survey loader / parser
   * @param cfg
   */
  var Survey = function (cfg, cpps, browser) {
    this.cfg = cfg;
    this.data = null;
    this.cpps = cpps;
    this.browser = browser;
    this.qs = [];
    this._topic = false;
    this.SurveyUIUpdated = new utils.FSEvent();
    // Submit button clicked. The parent can handle it the way it wants.
    this.SubmitClicked = new utils.FSEvent();

    // Survey listens to this event to get data.
    this.SurveyData = new utils.FSEvent();

    this.defaultCfg = SurveyConfig.survey;

    this.SurveyData.subscribe(
      function (res, cb) {
        // this.data, res, comes from the survey server
        this.data = this._transpileJSONDef(JSON.parse(res));

        // this.cfg comes mostly from the client_code_template/clientconfig/productconfig/feedback/product_config.js
        this.data.meta.privacyurl = this.cfg.privacyuri || this.cfg.privacyuri;
        this.data.meta.privacytext = this.data.meta.privacytext || this.cfg.privacytext;

        // this.defaultCfg comes from client_code/src/survey/surveyconfig.js
        this.data.ext = fs.ext({}, this.defaultCfg.ext, this.data.ext);
        this.data.meta.unavailable = this.data.meta.unavailable || this.defaultCfg.unavailable;
        this.data.meta.expired = this.data.meta.expired || this.defaultCfg.expired;
        this.data.meta.submittext = this.data.meta.submittext || this.defaultCfg.submittext;

        var ctx = this;
        var meta = this.data.meta;
        var hasBanner = !!meta.logo2graphic;
        var hasLogo = !!meta.logo1graphic;
        var gotBanner = false;
        var gotLogo = false;
        var signal = function () {
          if (cb) {
            cb(ctx.data);
          }
        };

        if (!hasBanner && !hasLogo) {
          signal();
        } else {
          if (hasBanner) {
            /* pragma:DEBUG_START */
            console.warn("fb: preloading banner image");
            /* pragma:DEBUG_END */
            utils.imgInfo(meta.logo2graphic, function (width, height) {
              gotBanner = true;
              if (!hasLogo || (hasLogo && gotLogo)) {
                signal();
              }
            });
          }
          if (hasLogo) {
            /* pragma:DEBUG_START */
            console.warn("fb: preloading logo image");
            /* pragma:DEBUG_END */
            utils.imgInfo(meta.logo1graphic, function (width, height) {
              gotLogo = true;
              if (!hasBanner || (hasBanner && gotBanner)) {
                signal();
              }
            });
          }
        }
      }.bind(this),
      true, true);
  };

  /**
   * Convert default JSON definition into one that we can use in templating
   * @param def
   * @private
   */
  Survey.prototype._transpileJSONDef = function (def) {
    var main = def.survey.content.main,
      cq = main.cq,
      ca = main.ca,
      ncq = main.ncq,
      ndef = {
        meta: def.survey.content.meta.info,
        ext: def.survey.content.meta["ext-info"],
        notopic: [],
        topics: []
      },
      i, v, q, a,
      amp = /&amp;/ig,
      lt = /&lt;/ig,
      gt = /&gt;/ig,
      quot = /&quot;/ig,
      nbsp = /&nbsp;/ig,
      validTopics = {};

    // Force qstns to be an array
    if (!ncq || typeof ncq == "string") {
      ncq = { qstn: [] };
    }
    if (ncq.qstn && typeof (ncq.qstn.length) == 'undefined') {
      ncq.qstn = [ncq.qstn];
    }

    if (!this.cfg.autowhitelist && this.cfg.topics.length > 0) {

      // For popup mode surveys, set this so that TopicTester works with the correct URL.
      window._acsURL = fs.getParam('fsUrl');

      // Test the topic whitelists
      for (var g = 0; g < this.cfg.topics.length; g++) {
        var tp = this.cfg.topics[g];
        if (TopicTester(tp)) {
          validTopics[tp.answerId] = true;
        }
      }

    }

    // This decodes HTML Entities
    function unnencodehtml(obj, attrs) {
      for (var i = 0; i < attrs.length; i++) {
        var elm = attrs[i];
        if (obj[elm]) {
          var temp = obj[elm];
          while (temp.indexOf('&amp;') > -1) {
            // Go through and replace ampersands in a loop as the '&' in '&amp;' is encoded.
            temp = temp.replace(amp, "&");
          }
          obj[elm] = temp.replace(lt, "<").replace(gt, ">").replace(quot, '"').replace(nbsp, " ");
        }
      }
    }

    // Reformat meta fields
    unnencodehtml(ndef.meta, ["epiloguetext", "prologuetext"]);

    // Go through fixed questions and aggregate their answers.
    for (i = 0; i < cq.qstn.length; i++) {
      q = cq.qstn[i];
      unnencodehtml(q, ["txt", "lbl"]);

      // Regardless of anything, a cq question is a fixed question.
      ndef.notopic.push(q);
      q.answers = [];
      for (v = 0; v < ca.ans.length; v++) {
        a = ca.ans[v];
        if (a.qid == q.id) {
          // If there's an answer, the question goes to topics array?
          ndef.topics.push(a);
          q.answers.push(a);
        }
      }
    }

    for (i = 0; i < ncq.qstn.length; i++) {
      q = ncq.qstn[i];
      unnencodehtml(q, ["txt", "lbl"]);
      q.answers = [];
      for (v = 0; v < ca.ans.length; v++) {
        a = ca.ans[v];
        if (a.qid == q.id) {
          q.answers.push(a);
        }
      }
    }

    // Only do topic whitelisting if we haven't set the flag
    if (!this.cfg.autowhitelist && this.cfg.topics.length > 0) {
      // Remove invalid topics
      for (v = 0; v < ndef.topics.length; v++) {
        if (!validTopics[ndef.topics[v].id]) {
          ndef.topics.splice(v--, 1);
        }
      }

      // Kill them from the answers list of the select question
      for (v = 0; v < ndef.notopic.length; v++) {
        if (ndef.notopic[v].qt == Classes.questionType.SELECT) {
          for (i = 0; i < ndef.notopic[v].answers.length; i++) {
            if (!validTopics[ndef.notopic[v].answers[i].id]) {
              ndef.notopic[v].answers.splice(i--, 1);
            }
          }
        }
      }
    }

    // Populate the topics
    for (i = 0; i < ndef.topics.length; i++) {
      var tpc = ndef.topics[i];
      tpc.questions = [];
      if (ncq.qstn) {
        for (v = 0; v < ncq.qstn.length; v++) {
          if (ncq.qstn[v].aid == tpc.id) {
            unnencodehtml(ncq.qstn[v], ["txt", "lbl"]);
            tpc.questions.push(ncq.qstn[v]);
          }
        }
      }
    }

    // Compile a final list of visible topics
    var vistp = [];
    for (i = 0; i < ndef.notopic.length; i++) {
      if (ndef.notopic[i].qt == Classes.questionType.SELECT) {
        vistp = ndef.notopic[i].answers;
      }
    }
    ndef.vistopics = vistp;
    ndef.ncq = ncq;
    // Spit it out
    return ndef;
  };

  /**
   * Get the currently specified rating
   * @returns {number}
   * @private
   */
  Survey.prototype._getScore = function () {
    var qs = this.qs;
    return (!!qs[0]._getRating ? qs[0]._getRating() : 0);
  };

  /**
   * Serialize all the responses to an object
   */
  Survey.prototype._serialize = function () {
    var res = {
      "mid": this.cfg.mid,
      "url": (window.location.toString().indexOf("&fsUrl") > -1 ? fs.getParam("fsUrl") : window.location.toString()),
      "responses": []
    },
      resp = res.responses,
      qs = this.qs,
      allcpps,
      urlcx;

    if (this.data.vistopics.length == 1) {
      // There's only one topic. Manually add the response for the topic chooser
      for (var s = 0; s < this.data.notopic.length; s++) {
        var tp = this.data.notopic[s];
        if (tp.qt == Classes.questionType.SELECT) {
          // We've got the topic question
          resp.push({
            "questionId": tp.id,
            "answerId": tp.answers[0].id
          });
          break;
        }
      }
    }

    for (var i = 0; i < qs.length; i++) {
      var qid = qs[i].cfg.id,
        qt = qs[i].cfg.qt;
      if (qid) {
        var qAns = qs[i].getAnswer();
        if (!!qAns) {
          if (qAns && qt == Classes.questionType.CHECKBOX) {
            // Multi Response
            resp.push.apply(resp, qAns);
          } else {
            // Single Response.
            resp.push(qAns);
          }
        }
      }
    }

    // Do CPPS
    allcpps = this.cpps.all();
    for (var cp in allcpps) {
      resp.push({
        "questionId": cp,
        "answerText": allcpps[cp]
      });
    }

    // Add the version
    if (this.cfg.version) {
      res.version = this.cfg.version;
    }

    // Do cxReplay session ID's only if we're not in blacklist mode
    if (this.cfg.replay === true && typeof this.cfg.record !== 'undefined' && typeof this.cfg.record.recorder !== 'undefined' && this.cfg.record.recorder !== null) {
      res.globalId = this.cfg.record.recorder.getGlobalId();
      res.sessionId = '';
    }

    // Add the replay global id (if applicable - new tab surveys)
    urlcx = window.location.href.match(/cxrid=([\d\w]*)&/);
    if (urlcx && urlcx[1]) {
      res.globalId = urlcx[1];
      res.sessionId = '';
    }

    // Run stringify
    res = JSON.stringify(res);
    // Spit out a string
    return res;
  };

  /**
   * Get config for a question
   * @param questionId
   */
  Survey.prototype._getQConfig = function (qId) {
    var i,
      j,
      tpcs = this.data.notopic;
    for (i = 0; i < tpcs.length; i++) {
      if (qId == tpcs[i].id) {
        return tpcs[i];
      }
    }
    tpcs = this.data.ncq.qstn;
    for (j = 0; j < tpcs.length; j++) {
      if (qId == tpcs[j].id) {
        return tpcs[j];
      }
    }
  };

  /**
   * Get question object for a question
   * @param questionId
   */
  Survey.prototype._getQObject = function (qId) {
    if (this.qs.length > 0 && !!qId) {
      for (var i = 0; i < this.qs.length; i++) {
        if (this.qs[i].cfg.id == qId) {
          return this.qs[i];
        }
      }
    }
    return false;
  };

  /**
   * Run skiplogic and readjust the dom.
   * Make sure the question falls in the current topic.
   * Run the skiplogic rules before rendering a question.
   * Get every question that has rules set and then check if those rules are conforming.
   * @param qid
   */
  Survey.prototype._renderSurvey = function (qid) {
    // Topic has changed.
    var q = this._getQObject(qid), tc;
    if (q) {
      tc = this._checkTopicChange(q.getAnswer());
    }

    if (!!tc) {
      // Topic changed, show these questions running skiplogic.
      this._runSkipLogic(this.data.vistopics[tc - 1].questions);
      // Topic changed, hide the other questions.
      for (var n = 0; n < this.data.vistopics.length; n++) {
        if (n === tc - 1) {
          continue;
        } else {
          var otherTpQs = this.data.vistopics[n].questions;
          for (var p = 0; p < otherTpQs.length; p++) {
            var qn = this._getQObject(otherTpQs[p].id);
            qn.hide();
          }
        }
      }
    } else {
      // State Changed..
      for (var m = 0; m < this.data.vistopics.length; m++) {
        var tpk = this._checkWhatTopic(qid);
        if (tpk) {
          this._runSkipLogic(this.data.vistopics[tpk - 1].questions);
        } else {
          // These are the persistent questions like the basic required star rating that has changed.
          if (this._topic) {
            for (var z = 0; z < this.data.vistopics.length; z++) {
              if (this.data.vistopics[z].id == this._topic) {
                this._runSkipLogic(this.data.vistopics[z].questions);
              }
            }
          }
        }
      }
    }
  };

  /**
   * Check if this is a topic change
   * @private
   * @param ans
   * @return Number|boolean - Number is index + 1 of visibletopics arr. boolean false implies it's not a topic change.
   */
  Survey.prototype._checkTopicChange = function (ans) {
    var topId = ans.answerId;
    if (typeof topId !== "string") {
      return false;
    }
    for (var m = 0; m < this.data.vistopics.length; m++) {
      if (this.data.vistopics[m].id == topId) {
        return m + 1;
      }
    }
    return false;
  };

  /**
   * Check what topic a question belongs to.
   * @private
   * @param qid
   * @return Number|boolean - Number is index + 1 of visibletopics arr. boolean false means it's a fixed question that doesn't belong to a topic.
   */
  Survey.prototype._checkWhatTopic = function (qid) {
    for (var m = 0; m < this.data.vistopics.length; m++) {
      var qs = this.data.vistopics[m].questions;
      for (var l = 0; l < qs.length; l++) {
        if (qs[l].id == qid) {
          return m + 1;
        }
      }
    }
    return false;
  };

  /**
   * Runs skiplogic on a question or an array of questions
   * @private
   * @return
   */
  Survey.prototype._runSkipLogic = function (qs) {
    if (!Array.isArray(qs)) {
      qs = [qs];
    }

    for (var i = 0; i < qs.length; i++) {
      var q = this._getQObject(qs[i].id),
        rules = q.cfg.rules,
        passed = false;

      if (rules.length > 0) {
        for (var k = 0; k < rules.length; k++) {
          var ruleQ = this._getQObject(rules[k].question);
          if (ruleQ) {
            passed = passed || (ruleQ.checkRule(rules[k]) && !!ruleQ.cfg.isVisible);
          }
        }
      } else {
        passed = true;
      }
      if (passed) {
        q.show();
      } else {
        q.hide();
      }
    }

  };

  /**
   * Validate the Survey
   * @private
   * @return Object|boolean
   */
  Survey.prototype._validateSurvey = function () {
    var valid = true;
    var focusElement;
    var currentQuestion;

    if (this.qs && this.qs.length > 0) {
      for (var i = this.qs.length - 1; i >= 0; i--) {
        currentQuestion = this.qs[i].qs;
        if (!this.qs[i].validate()) {
          valid = valid && false;
          currentQuestion.setAttribute("aria-invalid", "true");
          if (!focusElement) {
            focusElement = this.qs[i].qs;
            focusElement.setAttribute("tabindex", "0");
          }
          currentQuestion.setAttribute("aria-label", "The submission for this section is invalid");
        } else {
          currentQuestion.setAttribute("aria-invalid", "false");
          if (currentQuestion.getAttribute("aria-label")) {
            currentQuestion.removeAttribute("aria-label");
          }
        }
      }
    }
    // show/hide the validation block.
    if (focusElement) {
      focusElement.focus();
    }
    this._validationStatus(!valid);
    return valid;
  };

  /**
   * Bind to an HTML Survey
   * @param nd
   */
  Survey.prototype.bind = function (nd) {
    var ctx = this;

    // Have we already submitted the data?
    ctx.submitted = false;
    nd = $(nd);

    var qs = nd.$('.acs-feedback__block');
    var surveyQFactory = new SurveyQuestion();
    for (var i = 0; i < qs.length; i++) {
      var cfg = this._getQConfig(qs[i].getAttribute("questionid"));
      if (cfg) {
        var q = surveyQFactory.getQuestion(qs[i], cfg);
        this.qs.push(q);
        this.qs[this.qs.length - 1].stateChanged.subscribe(this._renderSurvey.bind(this), false, true);
      }
    }


    // All the things to update when UIUpdated triggers.
    var tmfn = function () {
      for (var i = 0; i < this.qs.length; i++) {
        if (this.qs[i].cfg.qt == Classes.questionType.SELECT) {
          this.qs[i].updateSelects();
        }
      }
    }.bind(this);

    this.SurveyUIUpdated.subscribe(function () {
      setTimeout(tmfn, 100);
    });

    ctx.$el = nd;

    var heading = nd.$(".acs-headingzone h1");
    for (var k = 0; k < heading.length; k++) {
      $(heading[k]).addClass("acs-feedback__heading acs-feedback__heading--h1");
    }

    // Do the topic switcher
    var topicchooser = nd.$('.acs-topic__selector')[0];
    // Show a topic
    var showTopic = function (tp) {
      var tpks = nd.$(".acs-feedback__topic");
      for (var i = 0; i < tpks.length; i++) {
        $(tpks[i]).removeClass('acs-visible__topic');
      }
      try {
        $(document.getElementById("topk_" + tp)).addClass('acs-visible__topic');
        ctx._topic = tp;
      } catch (E) {

      }

      // Signal that the UI updated
      ctx.SurveyUIUpdated.fire();
    }.bind(this);

    if (topicchooser) {
      // Bind to the change event of the topic selector
      utils.Bind(topicchooser, "feedback:change", function (e) {
        showTopic(e.target.value);
      });
    }
    // Show the only topic, if applicable
    if (this.data.vistopics.length == 1) {
      this._topic = this.data.vistopics[0].id;
      this._renderSurvey();
      $(document.getElementById("topk_" + this.data.vistopics[0].id)).addClass('acs-visible__topic');
      tmfn();
    }

    // Do the submit button
    utils.Bind(nd.$('.acs-submit-feedback__button')[0], "click", function (e) {
      var valid = this._validateSurvey();
      if (valid && !this.submitted) {
        this.SubmitClicked.fire();
        this.submitted = true;
      }
      if (e && e.preventDefault) {
        e.preventDefault();
      }
      return false;
    }.bind(this));

    // This fixes triggering beforeunload event on clicking on a mailto link.
    var mailtoClickCB = function () {
      utils._preventUnloadFor(10);
    }, mailtos = document.querySelectorAll('a[href^="mailto"]');
    for (var j = 0; j < mailtos.length; j++) {
      utils.Bind(mailtos[j], "feedback:click", mailtoClickCB);
    }

    // This makes the stars inline if there are 'required' fields.
    var ps = document.querySelectorAll('.acs-feedback__label p');
    for (var l = 0; l < ps.length; l++) {
      $(ps[l]).css({ "display": "inline" });
    }
  };

  /**
   * Check whether a survey is expired or not.
   *
   */
  Survey.prototype.isExpired = function () {
    var currDate = new Date(),
      // Expiry date 12 AM.
      expDate,
      // Today 12 AM.
      cmpDate = new Date(currDate.getFullYear(), currDate.getMonth(), currDate.getDate()),
      exp;

    if (!!this.cfg.fbexpiredate) {
      exp = this.cfg.fbexpiredate.split('-');
      expDate = new Date(exp[0], Number(exp[1]) - 1, exp[2]);
      return (expDate < cmpDate);
    } else {
      return false;
    }
  };

  /**
   * Set the validation status
   * @param onoff
   * @private
   */
  Survey.prototype._validationStatus = function (onoff) {
    var valv = $(this.$el.$(".acs-validation-block")[0]);
    if (onoff) {
      valv.css({ display: 'block' });
    } else {
      valv.css({ display: 'none' });
    }
  };

  /**
   * Spit out the result
   */
  return {
    SurveyBuilder: Survey,
    TopicTester: TopicTester
  };

})();