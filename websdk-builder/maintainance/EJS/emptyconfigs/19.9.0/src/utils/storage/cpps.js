/**
 * Class for setting custom pass parameters
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { globalConfig, enc } from "../../fs/index";
import { FSEvent } from "../dom/event";

/**
 * Constructor for CPP class
 * @param fstorage {FSStorage} The Storage instance
 * @constructor
 */
class CPPS {
  constructor(fstorage, expiration) {
    this.gs = fstorage;
    this.onSet = new FSEvent();
    this.exp = expiration || 1000 * 60 * 60 * 24;

    // set this to the global config in contexts that don't have it
    // like popup windows (tracker, feedback surveys, etc)
    this.config = globalConfig;
  }

  /**
   * Handles CPP interactions.
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
   * Set a CPP to the value provided.
   * @param key
   * @param value
   */
  set(key, value) {
    if (this._isCPPEnabled(key)) {
      const cpp = this.all();
      cpp[key] = `${value}`;
      this.gs.set("cp", cpp, this.exp);
      this.onSet.fire(key, value);
    }
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
    return this.gs.get("cp") || {};
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
   * Save the CPPS.
   */
  save() {
    this.gs.save();
  }

  /**
   * Append to an existing key, converting the single value to a list of values.
   * @param key
   * @param value
   * @param arg
   */
  append(key, value, arg) {
    const cpp = this.gs.get("cp") || {};
    let cppArr;
    let end;
    let start;
    if (this._isCPPEnabled(key)) {
      cpp[key] = `${cpp[key] || ""},${value}`;
      if (arg) {
        cppArr = cpp[key].split(",");
        end = cppArr.length - 1;
        start = cppArr.length > arg ? cppArr.length - arg : 0;
        cpp[key] = cppArr.splice(start, end - start + 1).join();
      }
      this.gs.set("cp", cpp);
    }
  }
}

export { CPPS };
