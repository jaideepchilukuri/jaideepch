/**
 * Reading CPPS
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { globalConfig, supportsDomStorage } from "../../fs/index";

/**
 * Constructor for a CPPS reader
 * @param namespace
 * @constructor
 */
class CPPS {
  constructor(namespace) {
    this.ns = namespace;

    // override this
    this.config = globalConfig;
  }

  /**
   * Holds the interface
   * @type {{get: Function, all: Function}}
   */
  /**
   * Return if a CPP is enabled
   */
  _isCPPEnabled(key) {
    if (!this.config.disable_cpps) {
      /* pragma:DEBUG_START */
      console.error("missing disable_cpps config in global config");
      /* pragma:DEBUG_END */
      return true;
    }

    if (this.config.disable_cpps.indexOf(key) < 0) return true;

    /* pragma:DEBUG_START */
    console.warn(`cpps: blocking cpp ${key}`);
    /* pragma:DEBUG_END */

    return false;
  }

  /**
   * Get a CPP
   * @param name
   */
  set(name, val) {
    if (!this._isCPPEnabled(name)) return;

    if (supportsDomStorage) {
      const dobj = JSON.parse(localStorage.getItem(this.ns) || "{}");
      dobj[name] = val;
      localStorage.setItem(this.ns, JSON.stringify(dobj));
    }
  }

  /**
   * Get a CPP
   * @param name
   */
  get(name) {
    const dobj = JSON.parse(localStorage.getItem(this.ns) || "{}");
    // returns undefined if not found.
    return dobj[name];
  }

  /**
   * Return an object containing all the CPPS that were set
   */
  all() {
    const dobj = JSON.parse(localStorage.getItem(this.ns) || "{}");
    return dobj;
  }
}

export { CPPS };
