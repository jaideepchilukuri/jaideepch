import { FSEvent, Async } from "../utils/utils";
import { TemplateGrabber } from "./templategrabber";
/**
 * A global loader for feedback.
 * 1. Prefetch all the templates by calling TemplateGrabber Function.
 * 2. Keep track of all the templates and do NOT fire unnecessary requests.
 */
const GlobalLoader = function(browser, cpps, templateTypes) {
  this.br = browser;
  this.cpps = cpps;
  this.templateHolder = {};
  this.loadSuccess = new FSEvent();
  this.loadFailure = new FSEvent();

  // Global Async Queue..
  const asyncQ = new Async(
    true,
    () => {
      /* pragma:DEBUG_START */
      console.warn("fb: Global init done.");
      /* pragma:DEBUG_END */
      this.loadSuccess.fire(this.templateHolder);
    },
    () => {
      /* pragma:DEBUG_START */
      console.warn("fb: Global init fail.");
      /* pragma:DEBUG_END */
      this.loadFailure.fire();
    }
  );

  // Get the templates..
  templateTypes.forEach(_template => {
    asyncQ.enqueue(prom => {
      const tg = new TemplateGrabber(this.br, this.cpps, _template);
      // Grab Templates..
      tg.grabTemplates(tmp => {
        if (tmp) {
          this.templateHolder[_template] = tmp;
          prom.resolve();
        } else {
          prom.error();
        }
      });
    });
  });
};

export { GlobalLoader };
