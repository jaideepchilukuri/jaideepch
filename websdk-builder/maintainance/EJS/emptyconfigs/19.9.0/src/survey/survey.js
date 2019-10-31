/**
 * Survey Class
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { $ } from "./dom/minidom";
import { checkTopicAllowed } from "./topictester";
import { ext, getParam } from "../fs/index";
import { CheckBoxQuestion } from "./checkbox";
import { InputTextQuestion } from "./inputtext";
import { questionType } from "./qtypes";
import { RadioQuestion } from "./radio";
import { SelectQuestion } from "./select";
import { StarQuestion } from "./star";
import { defaultSurveyConfig } from "./surveyconfig";
import { TextAreaQuestion } from "./textarea";
import { Bind, FSEvent, _preventUnloadFor, imgInfo } from "../utils/utils";

/**
 * Survey loader / parser
 * @param cfg
 */
class Survey {
  constructor(cfg, cpps, browser) {
    this.cfg = cfg;
    this.data = null;
    this.cpps = cpps;
    this.browser = browser;
    this.qs = [];
    this._topic = false;
    this.SurveyUIUpdated = new FSEvent();
    // Submit button clicked. The parent can handle it the way it wants.
    this.SubmitClicked = new FSEvent();

    // Survey listens to this event to get data.
    this.SurveyData = new FSEvent();

    this.defaultCfg = defaultSurveyConfig;

    this.SurveyData.subscribe(
      (res, cb) => {
        // this.data, res, comes from the survey server
        this.data = this._transpileJSONDef(JSON.parse(res));

        // this.cfg comes mostly from the client_code_template/clientconfig/productconfig/feedback/product_config.js
        this.data.meta.privacyurl = this.cfg.privacyuri || this.cfg.privacyuri;
        this.data.meta.privacytext = this.data.meta.privacytext || this.cfg.privacytext;

        // this.defaultCfg comes from client_code/src/survey/surveyconfig.js
        this.data.ext = ext({}, this.defaultCfg.ext, this.data.ext);
        this.data.meta.unavailable = this.data.meta.unavailable || this.defaultCfg.unavailable;
        this.data.meta.expired = this.data.meta.expired || this.defaultCfg.expired;
        this.data.meta.submittext = this.data.meta.submittext || this.defaultCfg.submittext;

        const ctx = this;
        const meta = this.data.meta;
        const hasBanner = !!meta.logo2graphic;
        const hasLogo = !!meta.logo1graphic;
        let gotBanner = false;
        let gotLogo = false;
        const signal = () => {
          if (cb) {
            return cb(ctx.data);
          }
        };

        if (!hasBanner && !hasLogo) {
          signal();
        } else {
          if (hasBanner) {
            /* pragma:DEBUG_START */
            console.warn("fb: preloading banner image");
            /* pragma:DEBUG_END */
            imgInfo(meta.logo2graphic, () => {
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
            imgInfo(meta.logo1graphic, () => {
              gotLogo = true;
              if (!hasBanner || (hasBanner && gotBanner)) {
                signal();
              }
            });
          }
        }
      },
      true,
      true
    );
  }

  /**
   * Convert default JSON definition into one that we can use in templating
   * @param def
   * @private
   */
  _transpileJSONDef(def) {
    const main = def.survey.content.main;
    const cq = main.cq;
    const ca = main.ca;
    let ncq = main.ncq;
    const ndef = {
      meta: def.survey.content.meta.info,
      ext: def.survey.content.meta["ext-info"],
      notopic: [],
      topics: [],
    };
    let i;
    let v;
    let q;
    let a;
    const amp = /&amp;/gi;
    const lt = /&lt;/gi;
    const gt = /&gt;/gi;
    const quot = /&quot;/gi;
    const nbsp = /&nbsp;/gi;
    const validTopics = {};

    // Force qstns to be an array
    if (!ncq || typeof ncq == "string") {
      ncq = { qstn: [] };
    }
    if (ncq.qstn && typeof ncq.qstn.length == "undefined") {
      ncq.qstn = [ncq.qstn];
    }

    if (!this.cfg.autowhitelist && this.cfg.topics.length > 0) {
      // For popup mode surveys, set this so that checkTopicAllowed works with the correct URL.
      window._acsURL = getParam("fsUrl");

      // Test the topic whitelists
      for (let g = 0; g < this.cfg.topics.length; g++) {
        const tp = this.cfg.topics[g];
        if (checkTopicAllowed(tp)) {
          validTopics[tp.answerId] = true;
        }
      }
    }

    // This decodes HTML Entities
    function unnencodehtml(obj, attrs) {
      for (let i = 0; i < attrs.length; i++) {
        const elm = attrs[i];
        if (obj[elm]) {
          let temp = obj[elm];
          while (temp.indexOf("&amp;") > -1) {
            // Go through and replace ampersands in a loop as the '&' in '&amp;' is encoded.
            temp = temp.replace(amp, "&");
          }
          obj[elm] = temp
            .replace(lt, "<")
            .replace(gt, ">")
            .replace(quot, '"')
            .replace(nbsp, " ");
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
        if (ndef.notopic[v].qt == questionType.SELECT) {
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
      const tpc = ndef.topics[i];
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
    let vistp = [];
    for (i = 0; i < ndef.notopic.length; i++) {
      if (ndef.notopic[i].qt == questionType.SELECT) {
        vistp = ndef.notopic[i].answers;
      }
    }
    ndef.vistopics = vistp;
    ndef.ncq = ncq;
    // Spit it out
    return ndef;
  }

  /**
   * Get the currently specified rating
   * @returns {number}
   * @private
   */
  _getScore() {
    const qs = this.qs;
    return qs[0]._getRating ? qs[0]._getRating() : 0;
  }

  /**
   * Serialize all the responses to an object
   */
  _serialize() {
    let res = {
      mid: this.cfg.mid,
      url:
        window.location.toString().indexOf("&fsUrl") > -1
          ? getParam("fsUrl")
          : window.location.toString(),
      responses: [],
    };
    const resp = res.responses;
    const qs = this.qs;

    if (this.data.vistopics.length == 1) {
      // There's only one topic. Manually add the response for the topic chooser
      for (let s = 0; s < this.data.notopic.length; s++) {
        const tp = this.data.notopic[s];
        if (tp.qt == questionType.SELECT) {
          // We've got the topic question
          resp.push({
            questionId: tp.id,
            answerId: tp.answers[0].id,
          });
          break;
        }
      }
    }

    for (let i = 0; i < qs.length; i++) {
      const qid = qs[i].cfg.id;
      const qt = qs[i].cfg.qt;
      if (qid) {
        const qAns = qs[i].getAnswer();
        if (qAns) {
          if (qAns && qt == questionType.CHECKBOX) {
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
    const allcpps = this.cpps.all();
    for (const cp in allcpps) {
      resp.push({
        questionId: cp,
        answerText: allcpps[cp],
      });
    }

    // Add the version
    if (this.cfg.version) {
      res.version = this.cfg.version;
    }

    // Do cxReplay session ID's only if we're not in blacklist mode
    if (
      this.cfg.replay === true &&
      typeof this.cfg.record !== "undefined" &&
      typeof this.cfg.record.recorder !== "undefined" &&
      this.cfg.record.recorder !== null
    ) {
      res.globalId = this.cfg.record.recorder.getGlobalId();
      res.sessionId = "";
    }

    // Add the replay global id (if applicable - new tab surveys)
    const urlcx = window.location.href.match(/cxrid=([\d\w]*)&/);
    if (urlcx && urlcx[1]) {
      res.globalId = urlcx[1];
      res.sessionId = "";
    }

    // Run stringify
    res = JSON.stringify(res);
    // Spit out a string
    return res;
  }

  /**
   * Get config for a question
   * @param questionId
   */
  _getQConfig(qId) {
    let i;
    let j;
    let tpcs = this.data.notopic;
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
  }

  /**
   * Get question object for a question
   * @param questionId
   */
  _getQObject(qId) {
    if (this.qs.length > 0 && !!qId) {
      for (let i = 0; i < this.qs.length; i++) {
        if (this.qs[i].cfg.id == qId) {
          return this.qs[i];
        }
      }
    }
    return false;
  }

  /**
   * Run skiplogic and readjust the dom.
   * Make sure the question falls in the current topic.
   * Run the skiplogic rules before rendering a question.
   * Get every question that has rules set and then check if those rules are conforming.
   * @param qid
   */
  _renderSurvey(qid) {
    // Topic has changed.
    const q = this._getQObject(qid);
    let tc;

    if (q) {
      tc = this._checkTopicChange(q.getAnswer());
    }

    if (tc) {
      // Topic changed, show these questions running skiplogic.
      this._runSkipLogic(this.data.vistopics[tc - 1].questions);
      // Topic changed, hide the other questions.
      for (let n = 0; n < this.data.vistopics.length; n++) {
        if (n === tc - 1) {
          continue;
        } else {
          const otherTpQs = this.data.vistopics[n].questions;
          for (let p = 0; p < otherTpQs.length; p++) {
            const qn = this._getQObject(otherTpQs[p].id);
            qn.hide();
          }
        }
      }
    } else {
      // State Changed..
      for (let m = 0; m < this.data.vistopics.length; m++) {
        const tpk = this._checkWhatTopic(qid);
        if (tpk) {
          this._runSkipLogic(this.data.vistopics[tpk - 1].questions);
        } else if (this._topic) {
          // These are the persistent questions like the basic required star rating that has changed.
          for (let z = 0; z < this.data.vistopics.length; z++) {
            if (this.data.vistopics[z].id == this._topic) {
              this._runSkipLogic(this.data.vistopics[z].questions);
            }
          }
        }
      }
    }
  }

  /**
   * Check if this is a topic change
   * @private
   * @param ans
   * @return Number|boolean - Number is index + 1 of visibletopics arr. boolean false implies it's not a topic change.
   */
  _checkTopicChange(ans) {
    const topId = ans.answerId;
    if (typeof topId !== "string") {
      return false;
    }
    for (let m = 0; m < this.data.vistopics.length; m++) {
      if (this.data.vistopics[m].id == topId) {
        return m + 1;
      }
    }
    return false;
  }

  /**
   * Check what topic a question belongs to.
   * @private
   * @param qid
   * @return Number|boolean - Number is index + 1 of visibletopics arr. boolean false means it's a fixed question that doesn't belong to a topic.
   */
  _checkWhatTopic(qid) {
    for (let m = 0; m < this.data.vistopics.length; m++) {
      const qs = this.data.vistopics[m].questions;
      for (let l = 0; l < qs.length; l++) {
        if (qs[l].id == qid) {
          return m + 1;
        }
      }
    }
    return false;
  }

  /**
   * Runs skiplogic on a question or an array of questions
   * @private
   * @return
   */
  _runSkipLogic(qs) {
    if (!Array.isArray(qs)) {
      qs = [qs];
    }

    for (let i = 0; i < qs.length; i++) {
      const q = this._getQObject(qs[i].id);
      const rules = q.cfg.rules;
      let passed = false;

      if (rules.length > 0) {
        for (let k = 0; k < rules.length; k++) {
          const ruleQ = this._getQObject(rules[k].question);
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
  }

  /**
   * Validate the Survey
   * @private
   * @return Object|boolean
   */
  _validateSurvey() {
    let valid = true;
    let focusElement;
    let currentQuestion;

    if (this.qs && this.qs.length > 0) {
      for (let i = this.qs.length - 1; i >= 0; i--) {
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
  }

  /**
   * Bind to an HTML Survey
   * @param nd
   */
  bind(nd) {
    const ctx = this;

    // Have we already submitted the data?
    ctx.submitted = false;
    nd = $(nd);

    const qs = nd.$(".acs-feedback__block");
    for (let i = 0; i < qs.length; i++) {
      const cfg = this._getQConfig(qs[i].getAttribute("questionid"));
      if (cfg) {
        const q = buildQuestionType(qs[i], cfg);
        q.stateChanged.subscribe(this._renderSurvey.bind(this), false, true);
        this.qs.push(q);
      }
    }

    // All the things to update when UIUpdated triggers.
    const tmfn = () => {
      for (let i = 0; i < this.qs.length; i++) {
        if (this.qs[i].cfg.qt == questionType.SELECT) {
          this.qs[i].updateSelects();
        }
      }
    };

    this.SurveyUIUpdated.subscribe(() => {
      setTimeout(tmfn, 100);
    });

    ctx.$el = nd;

    const heading = nd.$(".acs-headingzone h1");
    for (let k = 0; k < heading.length; k++) {
      $(heading[k]).addClass("acs-feedback__heading acs-feedback__heading--h1");
    }

    // Do the topic switcher
    const topicchooser = nd.$(".acs-topic__selector")[0];
    // Show a topic
    const showTopic = tp => {
      const tpks = nd.$(".acs-feedback__topic");
      for (let i = 0; i < tpks.length; i++) {
        $(tpks[i]).removeClass("acs-visible__topic");
      }
      try {
        $(document.getElementById(`topk_${tp}`)).addClass("acs-visible__topic");
        ctx._topic = tp;
      } catch (E) {}

      // Signal that the UI updated
      ctx.SurveyUIUpdated.fire();
    };

    if (topicchooser) {
      // Bind to the change event of the topic selector
      Bind(topicchooser, "feedback:change", e => {
        showTopic(e.target.value);
      });
    }
    // Show the only topic, if applicable
    if (this.data.vistopics.length == 1) {
      this._topic = this.data.vistopics[0].id;
      this._renderSurvey();
      $(document.getElementById(`topk_${this.data.vistopics[0].id}`)).addClass(
        "acs-visible__topic"
      );
      tmfn();
    }

    // Do the submit button
    Bind(nd.$(".acs-submit-feedback__button")[0], "click", e => {
      const valid = this._validateSurvey();
      if (valid && !this.submitted) {
        this.SubmitClicked.fire();
        this.submitted = true;
      }
      if (e && e.preventDefault) {
        e.preventDefault();
      }
      return false;
    });

    // This fixes triggering beforeunload event on clicking on a mailto link.
    const mailtoClickCB = () => {
      _preventUnloadFor(10);
    };
    const mailtos = document.querySelectorAll('a[href^="mailto"]');
    for (let j = 0; j < mailtos.length; j++) {
      Bind(mailtos[j], "feedback:click", mailtoClickCB);
    }

    // This makes the stars inline if there are 'required' fields.
    const ps = document.querySelectorAll(".acs-feedback__label p");
    for (let l = 0; l < ps.length; l++) {
      $(ps[l]).css({ display: "inline" });
    }
  }

  /**
   * Check whether a survey is expired or not.
   *
   */
  isExpired() {
    const currDate = new Date();

    // Today 12 AM.
    const cmpDate = new Date(currDate.getFullYear(), currDate.getMonth(), currDate.getDate());

    if (this.cfg.fbexpiredate) {
      const exp = this.cfg.fbexpiredate.split("-");
      const expDate = new Date(exp[0], Number(exp[1]) - 1, exp[2]);
      return expDate < cmpDate;
    }
    return false;
  }

  /**
   * Set the validation status
   * @param onoff
   * @private
   */
  _validationStatus(onoff) {
    const valv = $(this.$el.$(".acs-validation-block")[0]);
    if (onoff) {
      valv.css({ display: "block" });
    } else {
      valv.css({ display: "none" });
    }
  }
}

const questionTypeFactories = [
  CheckBoxQuestion.build,
  InputTextQuestion.build,
  RadioQuestion.build,
  SelectQuestion.build,
  StarQuestion.build,
  TextAreaQuestion.build,
];

function buildQuestionType(qs, cfg) {
  for (let i = 0; i < questionTypeFactories.length; i++) {
    const q = questionTypeFactories[i](qs, cfg);
    if (q) {
      return q;
    }
  }

  return null;
}

// export { Survey };
// export { checkTopicAllowed } from "./topictester";

export { Survey };
