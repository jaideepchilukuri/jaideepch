/**
 * A Template grabber that fetches templates for a particular badge config using an AsyncQueue.
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Ani Pendakur (ani.pendakur@answers.com)
 *
 */

import { makeURI } from "../fs/index";
import { loadCSS, Async, TemplateFetcher } from "../utils/utils";
import { Singletons } from "./top";

/**
 * This needs to be unaware of anything other than grabbing css and templates.
 * Keeping this simple.
 */
class TemplateGrabber {
  constructor(browser, cpps, template) {
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
  }

  /**
   * Get the css for the template
   * @return {Element|*}
   */
  getCss(prom) {
    loadCSS(
      makeURI(`$templates/feedback/${this.template || "default"}/main.css`),
      link => {
        if (link) {
          /* pragma:DEBUG_START */
          console.warn("fb: css loaded");
          /* pragma:DEBUG_END */
          if (prom) {
            prom.resolve();
          }
          // Focus element is attached to this event
          Singletons.onModalCssRetrieved.fire();
        } else if (prom) {
          prom.error();
        }
      },
      null,
      this.br
    );
  }

  /**
   * Grabs a template by making a TemplateFetcher call.
   * @return Object
   * @param type what kind of template
   * @param prom promise to be resolved to signal the caller
   * @param cb callback that can be used to pass the results back.
   */
  getTemplate(type, prom, cb) {
    const url = makeURI(`$templates/feedback/${this.template || "default"}/${type}.html`);

    // Make a call to get the error template
    const jp = new TemplateFetcher({
      success(res) {
        if (prom) {
          prom.resolve();
        }
        if (cb) {
          return cb(res);
        }
      },
      failure() {
        if (prom) {
          prom.error();
        }
      },
    });
    jp.get(url);
  }

  /**
   * Grabs badge, surveycontents and epilogue templates.
   * @return Object
   * @param type, cfg
   */
  grabTemplates(cb) {
    this.queue = new Async(
      true,
      () => {
        /* pragma:DEBUG_START */
        console.warn("fb: Fetched ", this.template, " templates.");
        /* pragma:DEBUG_END */
        if (cb) {
          return cb({
            typeTemplate: this.typeTemplate,
            emTemplate: this.emTemplate,
            epTemplate: this.epTemplate,
            svContentsTemplate: this.svContentsTemplate,
          });
        }
      },
      () => {
        /* pragma:DEBUG_START */
        console.warn("fb: Failed fetching ", this.template, " templates.");
        /* pragma:DEBUG_END */
      }
    );

    // Queue in all the async requests..
    this.queue.enqueue(prom => {
      this.getCss(prom);
    });
    this.queue.enqueue(prom => {
      this.getTemplate("badge", prom, template => {
        this.typeTemplate = template;
      });
    });
    this.queue.enqueue(prom => {
      this.getTemplate("serviceunavailable", prom, template => {
        this.emTemplate = template;
      });
    });
    this.queue.enqueue(prom => {
      this.getTemplate("epilogue", prom, template => {
        this.epTemplate = template;
      });
    });
    this.queue.enqueue(prom => {
      this.getTemplate("surveycontents", prom, template => {
        this.svContentsTemplate = template;
      });
    });
  }
}

export { TemplateGrabber };
