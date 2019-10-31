/**
 * Google Analytics
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { nextTick } from "../../fs/index";
import { _W } from "../top";

/**
 * The Google Analytics Module
 */
const GA = {
  /**
   * Does the site have Google Analytics?
   */
  has() {
    const ga = _W.ga;
    return typeof ga == "function" && ga.getAll && ga.getAll().length;
  },

  /**
   * Get the GA ID
   * @param cb
   */
  uid(cb) {
    const nt = nextTick;
    if (GA.has()) {
      _W.ga(tracker => {
        nt(() => {
          if (tracker) {
            return cb(tracker.get("clientId"));
          } else {
            try {
              return cb(_W.ga.getAll()[0].get("clientId"));
            } catch (e) {
              return cb();
            }
          }
        });
      });
    } else {
      nt(() => cb());
    }
  },
};

export { GA };
