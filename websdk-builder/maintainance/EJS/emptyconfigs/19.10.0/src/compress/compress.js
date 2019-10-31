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

/**
 * Compress it
 * @param data
 */
function compress(data) {
  const input = _encodeUtf8(data);

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

    return _decodeUtf8(inflated);
  }
}

/**
 * Convert a UTF-16 string into a UTF-8 Uint8Array
 */
function _encodeUtf8(str) {
  if (typeof TextEncoder !== "undefined" && TextEncoder.prototype.encode) {
    // if there's a native version use that
    const encoder = new TextEncoder();
    return encoder.encode(str);
  }

  // From https://developer.mozilla.org/en-US/docs/Web/API/TextEncoder
  // todo: remove this polyfill when we drop IE support
  const len = str.length;
  let resPos = 0;

  // The Uint8Array's length must be at least 3x the length of the string because an invalid UTF-16
  //  takes up the equivelent space of 3 UTF-8 characters to encode it properly. However, Array's
  //  have an auto expanding length and 1.5x should be just the right balance for most uses.
  const resArr = new Uint8Array(len * 3);
  for (let point = 0, nextcode = 0, i = 0; i !== len; ) {
    point = str.charCodeAt(i);
    i += 1;
    if (point >= 0xd800 && point <= 0xdbff) {
      if (i === len) {
        resArr[resPos++] = 0xef; /*0b11101111*/
        resArr[resPos++] = 0xbf; /*0b10111111*/
        resArr[resPos++] = 0xbd; /*0b10111101*/
        break;
      }
      // https://mathiasbynens.be/notes/javascript-encoding#surrogate-formulae
      nextcode = str.charCodeAt(i);
      if (nextcode >= 0xdc00 && nextcode <= 0xdfff) {
        point = (point - 0xd800) * 0x400 + nextcode - 0xdc00 + 0x10000;
        i += 1;
        if (point > 0xffff) {
          resArr[resPos++] = (0x1e /*0b11110*/ << 3) | (point >>> 18);
          resArr[resPos++] = (0x2 /*0b10*/ << 6) | ((point >>> 12) & 0x3f); /*0b00111111*/
          resArr[resPos++] = (0x2 /*0b10*/ << 6) | ((point >>> 6) & 0x3f); /*0b00111111*/
          resArr[resPos++] = (0x2 /*0b10*/ << 6) | (point & 0x3f); /*0b00111111*/
          continue;
        }
      } else {
        resArr[resPos++] = 0xef; /*0b11101111*/
        resArr[resPos++] = 0xbf; /*0b10111111*/
        resArr[resPos++] = 0xbd; /*0b10111101*/
        continue;
      }
    }
    if (point <= 0x007f) {
      resArr[resPos++] = (0x0 /*0b0*/ << 7) | point;
    } else if (point <= 0x07ff) {
      resArr[resPos++] = (0x6 /*0b110*/ << 5) | (point >>> 6);
      resArr[resPos++] = (0x2 /*0b10*/ << 6) | (point & 0x3f); /*0b00111111*/
    } else {
      resArr[resPos++] = (0xe /*0b1110*/ << 4) | (point >>> 12);
      resArr[resPos++] = (0x2 /*0b10*/ << 6) | ((point >>> 6) & 0x3f); /*0b00111111*/
      resArr[resPos++] = (0x2 /*0b10*/ << 6) | (point & 0x3f); /*0b00111111*/
    }
  }
  return resArr.subarray(0, resPos);
}

function _decodeUtf8(bytes) {
  if (typeof TextDecoder !== "undefined" && TextDecoder.prototype.decode) {
    // if there's a native version use that
    const decoder = new TextDecoder("utf-8");
    return decoder.decode(bytes.buffer);
  }

  // polyfill from: https://github.com/samthor/fast-text-encoding/blob/master/text.js
  // Copyright 2017 Sam Thorogood. All rights reserved.
  let pos = 0;
  const len = bytes.length;
  let out = "";
  let byte1;
  let byte2;
  let byte3;
  let byte4;

  while (pos < len) {
    byte1 = bytes[pos++];
    if (byte1 === 0) {
      break; // NULL
    }

    if ((byte1 & 0x80) === 0) {
      // 1-byte
      out += String.fromCharCode(byte1);
    } else if ((byte1 & 0xe0) === 0xc0) {
      // 2-byte
      byte2 = bytes[pos++] & 0x3f;
      out += String.fromCharCode(((byte1 & 0x1f) << 6) | byte2);
    } else if ((byte1 & 0xf0) === 0xe0) {
      byte2 = bytes[pos++] & 0x3f;
      byte3 = bytes[pos++] & 0x3f;
      out += String.fromCharCode(((byte1 & 0x1f) << 12) | (byte2 << 6) | byte3);
    } else if ((byte1 & 0xf8) === 0xf0) {
      byte2 = bytes[pos++] & 0x3f;
      byte3 = bytes[pos++] & 0x3f;
      byte4 = bytes[pos++] & 0x3f;

      // this can be > 0xffff, so possibly generate surrogates
      let codepoint = ((byte1 & 0x07) << 0x12) | (byte2 << 0x0c) | (byte3 << 0x06) | byte4;
      if (codepoint > 0xffff) {
        // codepoint &= ~0x10000;
        codepoint -= 0x10000;
        out += String.fromCharCode(((codepoint >>> 10) & 0x3ff) | 0xd800);
        codepoint = 0xdc00 | (codepoint & 0x3ff);
      }
      out += String.fromCharCode(codepoint);
    }
  }

  return out;
}

export { compress, decompress };
