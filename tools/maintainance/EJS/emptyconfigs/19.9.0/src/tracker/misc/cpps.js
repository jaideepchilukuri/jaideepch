/**
 *
 * Copy-pasta of CPPs already in utils for some reason
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { globalConfig, enc, ext } from "../../fs/index";

/**
 * Tracker specific copy-pasta of CPPs class in utils
 */
class CPPS {
  /**
   * Constructor for CPP class
   * @param gstorage
   * @constructor
   */
  constructor(gstorage) {
    this.gs = gstorage;
    this._extras = {};

    // override this
    this.config = globalConfig;
  }

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
   * Set a CPP to the value provided.
   * @param key
   * @param value
   */
  set(key, value) {
    if (!this._isCPPEnabled(key)) return;

    const cpp = this.all();
    cpp[key] = value;
    this._extras[key] = value;
  }

  /**
   * Get the CPP value stored for the provided key.
   * @param key
   */
  get(key) {
    return this.all()[key];
  }

  /**
   * Get all CPP's
   */
  all() {
    return ext({}, this.gs.get("cp") || {}, this._extras);
  }

  /**
   * Get as a querystring
   */
  toQueryString() {
    const res = [];
    const all = this.all();
    for (const vr in all) {
      res.push(`cpp[${enc(vr)}]=${enc(all[vr])}`);
    }
    return res.join("&");
  }

  /**
   * Remove the CPP.
   * @param key
   */
  erase(key) {
    const cpp = this.all();
    delete cpp[key];
    this.gs.set("cp", cpp);
  }

  /**
   * Append to an existing key, converting the single value to a list of values.
   * @param key
   * @param value
   * @param arg
   */
  append(key, value, arg) {
    if (!this._isCPPEnabled(key)) return;

    const cpp = this.gs.get("cp") || {};
    cpp[key] = `${cpp[key] || ""},${value}`;
    if (arg) {
      const cppArr = cpp[key].split(",");
      const end = cppArr.length - 1;
      const start = cppArr.length > arg ? cppArr.length - arg : 0;
      cpp[key] = cppArr.splice(start, end - start + 1).join();
    }
    this.gs.set("cp", cpp);
  }
}

export { CPPS };
