/**
 * Provides interfaces to compression code (Zlib primarily)
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { Zlib } from "./pako";
import { encodeUtf8, decodeUtf8 } from "./encoding";

/**
 * Compress it
 * @param data
 */
function compress(data) {
  const input = encodeUtf8(data);

  const deflated = Zlib.zlibDeflate(input, { raw: true, to: "string" });

  // Translate the compressed byte array to a base-64 encoded string
  try {
    return btoa(deflated);
  } catch (e) {
    // CC-4696: some old versions of safari in webworkers don't have btoa
    // fixed here: https://bugs.webkit.org/show_bug.cgi?id=158576
    // returning empty string here will be picked up elsewhere to shut down recording
    return "";
  }
}

/**
 * Decompress a string
 * @param datastr
 */
function decompress(datastr) {
  if (datastr) {
    const decstr = atob(datastr);
    const buffer = new Uint8Array(decstr.length);
    for (let i = 0; i < decstr.length; i++) {
      buffer[i] = decstr.charCodeAt(i);
    }

    const inflated = Zlib.zlibInflate(buffer, { raw: true });

    return decodeUtf8(inflated);
  }
}

export { compress, decompress };
