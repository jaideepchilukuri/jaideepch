/**
 * TemplateFetcher
 *
 * (c) Copyright 2019 ForeSee, Inc.
 */

import { ext } from "../../fs/index";

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

    window._fsRequire([filename], res => {
      clearTimeout(timeout);
      this.opts.success(res);
    });
  }
}

export { TemplateFetcher };
