/**
 * TemplateFetcher
 *
 * (c) Copyright 2019 ForeSee, Inc.
 */

import { ext, makeURI, globalConfig, isSelfHosted } from "../../fs/index";

/**
 * TemplateFetcher fetches a template with a timeout and a special filename
 * @param opts
 * @constructor
 */
class TemplateFetcher {
  constructor(opts) {
    this.opts = ext(
      {
        success() {},
        failure() {},
        timeout: 5000,
      },
      opts
    );
  }

  /**
   * Get a file
   * @param src {String} The original source of the file
   */
  get(src) {
    const filename = src.replace(".html", "___html.js");

    const timeout = setTimeout(() => {
      this.opts.failure("timedout");
    }, this.opts.timeout);

    const modules = [filename];

    const shouldSanitize = isSelfHosted || globalConfig.sanitizeHTML;

    if (shouldSanitize) {
      modules.push(makeURI("$fs.sanitize.js"));
    }

    window._fsRequire(modules, (res, sanitizer) => {
      clearTimeout(timeout);
      if (shouldSanitize) {
        this.opts.success(dirty => {
          // recursively clean any strings that might contain HTML
          const clean = sanitizer.sanitizeObject(dirty);

          /* pragma:DEBUG_START */
          console.log("Sanitized template data:", clean);
          /* pragma:DEBUG_END */

          return res(clean);
        });
      } else {
        this.opts.success(res);
      }
    });
  }
}

export { TemplateFetcher };
