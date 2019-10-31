import { Compress } from "../misc/compression";

const data = `O Canada!
  Our home and native land!
  True patriot love in all of us command.
  Car ton bras sait porter l'épée,
  Il sait porter la croix!
  Ton histoire est une épopée
  Des plus brillants exploits.
  God keep our land glorious and free!
  O Canada, we stand on guard for thee.
  O Canada, we stand on guard for thee.`;

const cookie = [
  '{"when":1549929085898,"keys":{"cp":{"v":{"url":"https://localhost/testp',
  'ages/record/test1.html","code":"symlink","tz":"-480","product_type":"web',
  ' sdk","device_width":"2560","device_height":"1080","dpr":"1","window_widt',
  'h":"1105","window_height":"766","browser":"Chrome 74","os":"Mac","referre',
  'r":"https://localhost/testpages/record/test1.html","site":"localhost","si',
  'tekey":"htest","pv":"2","locale":"en","replay_id":"m3420772bb1243618c55b3',
  '47cef40467","sessionid":"m6b98e9b342e433e808fb8a6d9a292d3","TriggerMethod',
  '":"Traditional","dn":"default","dt":"classicdesktop"},"x":1550015484239,"',
  'ttl":86400000},"rid":{"v":"ff8463e4-cf8a-4648-be12-d9f7eaef9c97","x":1557',
  '705075369},"vi":{"v":"eef56d3b-2b2c-4807-af23-29bb42c53d7b","x":154993088',
  '3918,"ttl":1800000},"pl":{"v":1,"x":1549943475390,"ttl":14400000},"pv":{"',
  'v":2,"x":1550015483924,"ttl":86400000},"browsepv":{"v":2,"x":155001548393',
  '0,"ttl":86400000},"def":{"v":0,"x":1550015483933,"ttl":86400000},"dn":{"v',
  '":"default","x":1557705075402},"rc":{"v":"true","x":1557705075402},"rt":{',
  '"v":false,"x":1557705075407},"mid":{"v":"m3420772bb1243618c55b347cef40467',
  '","x":1557705075407},"grft":{"v":1549929083940,"x":1557705075407},"i":{"v',
  '":"p","x":1557705075983}}}',
].join("");

const short = JSON.stringify([
  { x: 5, y: 11 },
  { x: 6, y: 12 },
  { x: 7, y: 13 },
  { x: 25, y: 49 },
  { x: 52, y: 17 },
  { x: 39, y: 14 },
]);

// test the polyfills
describe("compression without TextEncoder/Decoder", () => {
  beforeEach(() => {
    window.TextEncoder = undefined;
    window.TextDecoder = undefined;
  });

  test("compression compresses", () => {
    expect(typeof TextEncoder).toEqual("undefined");
    expect(Compress.compress(data).length).toBeLessThan(data.length);
  });

  test("can decompress again", () => {
    const compressed = Compress.compress(data);
    expect(Compress.decompress(compressed)).toEqual(data);
  });

  test("can handle cookie data", () => {
    const compressed = Compress.compress(cookie);
    expect(Compress.decompress(compressed)).toEqual(cookie);
    expect(compressed.length).toBeLessThan(cookie.length);
  });

  test("can handle short data", () => {
    const compressed = Compress.compress(short);
    expect(Compress.decompress(compressed)).toEqual(short);
    expect(compressed.length).toBeLessThan(short.length);
  });
});

// test built in browser support
describe("compression with TextEncoder/Decoder", () => {
  beforeEach(() => {
    /**
     * Copyright 2017 Sam Thorogood. All rights reserved.
     *
     * Licensed under the Apache License, Version 2.0 (the "License"); you may not
     * use this file except in compliance with the License. You may obtain a copy of
     * the License at
     *
     *     http://www.apache.org/licenses/LICENSE-2.0
     *
     * Unless required by applicable law or agreed to in writing, software
     * distributed under the License is distributed on an "AS IS" BASIS, WITHOUT
     * WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied. See the
     * License for the specific language governing permissions and limitations under
     * the License.
     */

    /**
     * @constructor
     * @param {string=} utfLabel
     */
    class FastTextEncoder {
      constructor(utfLabel = "utf-8") {
        if (utfLabel !== "utf-8") {
          throw new RangeError(
            `Failed to construct 'TextEncoder': The encoding label provided ('${utfLabel}') is invalid.`
          );
        }
      }

      /**
       * @param {string} string
       * @param {{stream: boolean}=} options
       * @return {!Uint8Array}
       */
      encode(string, options = { stream: false }) {
        if (options.stream) {
          throw new Error(`Failed to encode: the 'stream' option is unsupported.`);
        }

        let pos = 0;
        const len = string.length;

        let at = 0; // output position
        let tlen = Math.max(32, len + (len >> 1) + 7); // 1.5x size
        let target = new Uint8Array((tlen >> 3) << 3); // ... but at 8 byte offset

        while (pos < len) {
          let value = string.charCodeAt(pos++);
          if (value >= 0xd800 && value <= 0xdbff) {
            // high surrogate
            if (pos < len) {
              const extra = string.charCodeAt(pos);
              if ((extra & 0xfc00) === 0xdc00) {
                ++pos;
                value = ((value & 0x3ff) << 10) + (extra & 0x3ff) + 0x10000;
              }
            }
            if (value >= 0xd800 && value <= 0xdbff) {
              continue; // drop lone surrogate
            }
          }

          // expand the buffer if we couldn't write 4 bytes
          if (at + 4 > target.length) {
            tlen += 8; // minimum extra
            tlen *= 1.0 + (pos / string.length) * 2; // take 2x the remaining
            tlen = (tlen >> 3) << 3; // 8 byte offset

            const update = new Uint8Array(tlen);
            update.set(target);
            target = update;
          }

          if ((value & 0xffffff80) === 0) {
            // 1-byte
            target[at++] = value; // ASCII
            continue;
          } else if ((value & 0xfffff800) === 0) {
            // 2-byte
            target[at++] = ((value >> 6) & 0x1f) | 0xc0;
          } else if ((value & 0xffff0000) === 0) {
            // 3-byte
            target[at++] = ((value >> 12) & 0x0f) | 0xe0;
            target[at++] = ((value >> 6) & 0x3f) | 0x80;
          } else if ((value & 0xffe00000) === 0) {
            // 4-byte
            target[at++] = ((value >> 18) & 0x07) | 0xf0;
            target[at++] = ((value >> 12) & 0x3f) | 0x80;
            target[at++] = ((value >> 6) & 0x3f) | 0x80;
          } else {
            // FIXME: do we care
            continue;
          }

          target[at++] = (value & 0x3f) | 0x80;
        }

        return target.slice(0, at);
      }
    }

    Object.defineProperty(FastTextEncoder.prototype, "encoding", { value: "utf-8" });

    /**
     * @constructor
     * @param {string=} utfLabel
     * @param {{fatal: boolean}=} options
     */
    class FastTextDecoder {
      constructor(utfLabel = "utf-8", options = { fatal: false }) {
        if (utfLabel !== "utf-8") {
          throw new RangeError(
            `Failed to construct 'TextDecoder': The encoding label provided ('${utfLabel}') is invalid.`
          );
        }
        if (options.fatal) {
          throw new Error(`Failed to construct 'TextDecoder': the 'fatal' option is unsupported.`);
        }
      }

      /**
       * @param {(!ArrayBuffer|!ArrayBufferView)} buffer
       * @param {{stream: boolean}=} options
       */
      decode(buffer, options = { stream: false }) {
        if (options["stream"]) {
          throw new Error(`Failed to decode: the 'stream' option is unsupported.`);
        }

        const bytes = new Uint8Array(buffer);
        let pos = 0;
        const len = bytes.length;
        const out = [];

        while (pos < len) {
          const byte1 = bytes[pos++];
          if (byte1 === 0) {
            break; // NULL
          }

          if ((byte1 & 0x80) === 0) {
            // 1-byte
            out.push(byte1);
          } else if ((byte1 & 0xe0) === 0xc0) {
            // 2-byte
            const byte2 = bytes[pos++] & 0x3f;
            out.push(((byte1 & 0x1f) << 6) | byte2);
          } else if ((byte1 & 0xf0) === 0xe0) {
            const byte2 = bytes[pos++] & 0x3f;
            const byte3 = bytes[pos++] & 0x3f;
            out.push(((byte1 & 0x1f) << 12) | (byte2 << 6) | byte3);
          } else if ((byte1 & 0xf8) === 0xf0) {
            const byte2 = bytes[pos++] & 0x3f;
            const byte3 = bytes[pos++] & 0x3f;
            const byte4 = bytes[pos++] & 0x3f;

            // this can be > 0xffff, so possibly generate surrogates
            let codepoint = ((byte1 & 0x07) << 0x12) | (byte2 << 0x0c) | (byte3 << 0x06) | byte4;
            if (codepoint > 0xffff) {
              // codepoint &= ~0x10000;
              codepoint -= 0x10000;
              out.push(((codepoint >>> 10) & 0x3ff) | 0xd800);
              codepoint = 0xdc00 | (codepoint & 0x3ff);
            }
            out.push(codepoint);
          } else {
            // FIXME: we're ignoring this
          }
        }

        return String.fromCharCode.apply(null, out);
      }
    }

    Object.defineProperty(FastTextDecoder.prototype, "encoding", { value: "utf-8" });

    Object.defineProperty(FastTextDecoder.prototype, "fatal", { value: false });

    Object.defineProperty(FastTextDecoder.prototype, "ignoreBOM", { value: false });

    window.TextEncoder = FastTextEncoder;
    window.TextDecoder = FastTextDecoder;
  });

  test("compression compresses", () => {
    expect(typeof TextEncoder).not.toEqual("undefined");
    expect(Compress.compress(data).length).toBeLessThan(data.length);
  });

  test("can decompress again", () => {
    const compressed = Compress.compress(data);
    expect(Compress.decompress(compressed)).toEqual(data);
  });
});
