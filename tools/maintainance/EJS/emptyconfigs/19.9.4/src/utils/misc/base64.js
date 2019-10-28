/**
 * Base64 Shim for older browsers
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { dec } from "../../fs/index";

/**
 * Base 64 Decode
 * @param str
 * @returns {String}
 */
const b64DecodeUnicode = str =>
  dec(
    Array.prototype.map
      .call(atob(str).split(""), c => `%${`00${c.charCodeAt(0).toString(16)}`.slice(-2)}`)
      .join("")
  );

export { b64DecodeUnicode };
