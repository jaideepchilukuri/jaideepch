/**
 * cxReplay Interface
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { enc, getParam } from "../fs/index";
import { AjaxTransport } from "../utils/utils";

/**
 * Replay namespace
 * @type {{}}
 */
const Replay = {
  /**
   * Global Session ID (if applicable)
   */
  cxrid: getParam("cxrid"),

  /**
   * Transmission/processing URL (if applicable)
   */
  cxrurl: getParam("cxrurl"),

  /**
   * Call process immediate if applicable
   */
  processImmediate() {
    if (Replay.cxrid && Replay.cxrurl) {
      const ajx = new AjaxTransport();
      ajx.send({
        method: "GET",
        url: `${Replay.cxrurl}process/${enc(Replay.cxrid)}`,
        failure() {
          /* pragma:DEBUG_START */
          console.warn(
            "fbs: Session processing request failed for global",
            Replay.cxrid,
            "Note: this doesn't necessarily mean there is a problem. The processing may already have been started."
          );
          /* pragma:DEBUG_END */
        },
        success() {
          /* pragma:DEBUG_START */
          console.log("fbs: Session processing started for global", Replay.cxrid);
          /* pragma:DEBUG_END */
        },
      });
    }
  },
};

export { Replay };
