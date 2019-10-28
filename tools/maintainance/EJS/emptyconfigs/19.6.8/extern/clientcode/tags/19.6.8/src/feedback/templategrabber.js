/**
 * A Template grabber that fetches templates for a particular badge config using an AsyncQueue.
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Ani Pendakur (ani.pendakur@answers.com)
 *
 */

fs.provide("fs.TemplateGrabber");

fs.require("fs.Top");
fs.require("fs.Dom.MiniDOM");
fs.require("fs.ui.Badge");
fs.require("fs.API");

(function () {
  /**
   * This needs to be unaware of anything other than grabbing css and templates.
   * Keeping this simple.
   */
  var TemplateGrabber = function (browser, cpps, template) {
    /* pragma:DEBUG_START */
    console.warn("fb: template ready");
    /* pragma:DEBUG_END */
    this.template = template;
    this.br = browser;
    this.cpps = cpps;
    this.emTemplate = null;
    this.css = null;
    this.typeTemplate = null;
    this.svContentsTemplate = null;
    this.epTemplate = null;
  };

  /*
   * Get the css for the template
   * @return {Element|*}
   */
  TemplateGrabber.prototype.getCss = function (prom) {
    var link = utils.loadCSS(fs.makeURI("$templates/feedback/" + (this.template || 'default') + '/main.css'),
      function (link) {
        if (link) {
          /* pragma:DEBUG_START */
          console.warn("fb: css loaded");
          /* pragma:DEBUG_END */
          if (prom) {
            prom.resolve();
          }
          // Focus element is attached to this event
          Singletons.onModalCssRetrieved.fire();
        } else {
          if (prom) {
            prom.error();
          }
        }
      },
      null, this.br);
  };

  /*
   * Grabs a template by making a jsonp call.
   * @return Object
   * @param type what kind of template
   * @param prom promise to be resolved to signal the caller
   * @param cb callback that can be used to pass the results back.
   */
  TemplateGrabber.prototype.getTemplate = function (type, prom, cb) {
    var url = fs.makeURI("$templates/feedback/" + (this.template || 'default') + '/' + type + '.html'),
      prefix = 'templates_feedback_' + (this.template || 'default') + '_';

    // Make a call to get the error template
    var jp = new utils.JSONP({
      success: fs.proxy(function (res) {
        if (cb) {
          cb(res);
        }
        if (prom) {
          prom.resolve();
        }
      }, this),
      failure: fs.proxy(function (res) {
        if (prom) {
          prom.error();
        }
      }, this)
    });
    jp.get(url, prefix);
  };

  /*
   * Grabs badge, surveycontents and epilogue templates.
   * @return Object
   * @param type, cfg
   */
  TemplateGrabber.prototype.grabTemplates = function (cb) {
    this.queue = new utils.Async(true, fs.proxy(function () {
      /* pragma:DEBUG_START */
      console.warn("fb: Fetched ", this.template, " templates.");
      /* pragma:DEBUG_END */
      if (cb) {
        cb({
          'typeTemplate': this.typeTemplate,
          'emTemplate': this.emTemplate,
          'epTemplate': this.epTemplate,
          'svContentsTemplate': this.svContentsTemplate
        });
      }
    }, this), fs.proxy(function () {
      /* pragma:DEBUG_START */
      console.warn("fb: Failed fetching ", this.template, " templates.");
      /* pragma:DEBUG_END */
    }, this));

    // Queue in all the async requests..
    this.queue.enqueue(fs.proxy(function (prom) {
      this.getCss(prom);
    }, this));
    this.queue.enqueue(fs.proxy(function (prom) {
      this.getTemplate('badge', prom, fs.proxy(function (template) {
        this.typeTemplate = template;
      }, this));
    }, this));
    this.queue.enqueue(fs.proxy(function (prom) {
      this.getTemplate('serviceunavailable', prom, fs.proxy(function (template) {
        this.emTemplate = template;
      }, this));
    }, this));
    this.queue.enqueue(fs.proxy(function (prom) {
      this.getTemplate('epilogue', prom, fs.proxy(function (template) {
        this.epTemplate = template;
      }, this));
    }, this));
    this.queue.enqueue(fs.proxy(function (prom) {
      this.getTemplate('surveycontents', prom, fs.proxy(function (template) {
        this.svContentsTemplate = template;
      }, this));
    }, this));
  };

})();