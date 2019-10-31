/**
 * @preserve
 *  Pako https://github.com/nodeca/pako
 *
 *  (C) 1995-2013 Jean-loup Gailly and Mark Adler
 *  (C) 2014-2017 Vitaly Puzrin and Andrey Tupitsin
 *  (C) 2019      Verint Systems, Inc. (Modified to remove unused features)
 *
 *  This software is provided 'as-is', without any express or implied
 *  warranty. In no event will the authors be held liable for any damages
 *  arising from the use of this software.
 *
 *  Permission is granted to anyone to use this software for any purpose,
 *  including commercial applications, and to alter it and redistribute it
 *  freely, subject to the following restrictions:
 *
 *  1. The origin of this software must not be misrepresented; you must not
 *    claim that you wrote the original software. If you use this software
 *    in a product, an acknowledgment in the product documentation would be
 *    appreciated but is not required.
 *  2. Altered source versions must be plainly marked as such, and must not be
 *    misrepresented as being the original software.
 *  3. This notice may not be removed or altered from any source distribution.
 */

const Zlib = (() => {
  "use strict";

  /* eslint-disable no-var */

  function _has(obj, key) {
    return Object.prototype.hasOwnProperty.call(obj, key);
  }

  function assign(obj) {
    var sources = Array.prototype.slice.call(arguments, 1);
    while (sources.length) {
      var source = sources.shift();
      if (!source) {
        continue;
      }

      if (typeof source !== "object") {
        throw new TypeError(`${source}must be non-object`);
      }

      for (var p in source) {
        if (_has(source, p)) {
          obj[p] = source[p];
        }
      }
    }

    return obj;
  }

  function shrinkBuf(buf, size) {
    if (buf.length === size) {
      return buf;
    }
    if (buf.subarray) {
      return buf.subarray(0, size);
    }
    buf.length = size;
    return buf;
  }

  function arraySet(dest, src, src_offs, len, dest_offs) {
    if (src.subarray && dest.subarray) {
      dest.set(src.subarray(src_offs, src_offs + len), dest_offs);
      return;
    }

    for (var i = 0; i < len; i++) {
      dest[dest_offs + i] = src[src_offs + i];
    }
  }

  function flattenChunks(chunks) {
    var i;
    var l;
    var len;
    var pos;
    var chunk;
    var result;

    len = 0;
    for (i = 0, l = chunks.length; i < l; i++) {
      len += chunks[i].length;
    }

    result = new Uint8Array(len);
    pos = 0;
    for (i = 0, l = chunks.length; i < l; i++) {
      chunk = chunks[i];
      result.set(chunk, pos);
      pos += chunk.length;
    }

    return result;
  }

  var Buf8 = Uint8Array;
  var Buf16 = Uint16Array;
  var Buf32 = Int32Array;

  var Z_FIXED = 4;

  var Z_BINARY = 0;
  var Z_TEXT = 1;

  var Z_UNKNOWN = 2;

  function zero(buf) {
    var len = buf.length;
    while (--len >= 0) {
      buf[len] = 0;
    }
  }

  var STORED_BLOCK = 0;
  var STATIC_TREES = 1;
  var DYN_TREES = 2;

  var MIN_MATCH = 3;
  var MAX_MATCH = 258;

  var LENGTH_CODES = 29;

  var LITERALS = 256;

  var L_CODES = LITERALS + 1 + LENGTH_CODES;

  var D_CODES = 30;

  var BL_CODES = 19;

  var HEAP_SIZE = 2 * L_CODES + 1;

  var MAX_BITS = 15;

  var Buf_size = 16;

  var MAX_BL_BITS = 7;

  var END_BLOCK = 256;

  var REP_3_6 = 16;

  var REPZ_3_10 = 17;

  var REPZ_11_138 = 18;

  var extra_lbits = [
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    0,
    1,
    1,
    1,
    1,
    2,
    2,
    2,
    2,
    3,
    3,
    3,
    3,
    4,
    4,
    4,
    4,
    5,
    5,
    5,
    5,
    0,
  ];

  var extra_dbits = [
    0,
    0,
    0,
    0,
    1,
    1,
    2,
    2,
    3,
    3,
    4,
    4,
    5,
    5,
    6,
    6,
    7,
    7,
    8,
    8,
    9,
    9,
    10,
    10,
    11,
    11,
    12,
    12,
    13,
    13,
  ];

  var extra_blbits = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 2, 3, 7];

  var bl_order = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

  var DIST_CODE_LEN = 512;

  var static_ltree = new Array((L_CODES + 2) * 2);
  zero(static_ltree);

  var static_dtree = new Array(D_CODES * 2);
  zero(static_dtree);

  var _dist_code = new Array(DIST_CODE_LEN);
  zero(_dist_code);

  var _length_code = new Array(MAX_MATCH - MIN_MATCH + 1);
  zero(_length_code);

  var base_length = new Array(LENGTH_CODES);
  zero(base_length);

  var base_dist = new Array(D_CODES);
  zero(base_dist);

  function StaticTreeDesc(static_tree, extra_bits, extra_base, elems, max_length) {
    this.static_tree = static_tree;
    this.extra_bits = extra_bits;
    this.extra_base = extra_base;
    this.elems = elems;
    this.max_length = max_length;

    this.has_stree = static_tree && static_tree.length;
  }

  var static_l_desc;
  var static_d_desc;
  var static_bl_desc;

  function TreeDesc(dyn_tree, stat_desc) {
    this.dyn_tree = dyn_tree;
    this.max_code = 0;
    this.stat_desc = stat_desc;
  }

  function d_code(dist) {
    return dist < 256 ? _dist_code[dist] : _dist_code[256 + (dist >>> 7)];
  }

  function put_short(s, w) {
    s.pending_buf[s.pending++] = w & 0xff;
    s.pending_buf[s.pending++] = (w >>> 8) & 0xff;
  }

  function send_bits(s, value, length) {
    if (s.bi_valid > Buf_size - length) {
      s.bi_buf |= (value << s.bi_valid) & 0xffff;
      put_short(s, s.bi_buf);
      s.bi_buf = value >> (Buf_size - s.bi_valid);
      s.bi_valid += length - Buf_size;
    } else {
      s.bi_buf |= (value << s.bi_valid) & 0xffff;
      s.bi_valid += length;
    }
  }

  function send_code(s, c, tree) {
    send_bits(s, tree[c * 2], tree[c * 2 + 1]);
  }

  function bi_reverse(code, len) {
    var res = 0;
    do {
      res |= code & 1;
      code >>>= 1;
      res <<= 1;
    } while (--len > 0);
    return res >>> 1;
  }

  function bi_flush(s) {
    if (s.bi_valid === 16) {
      put_short(s, s.bi_buf);
      s.bi_buf = 0;
      s.bi_valid = 0;
    } else if (s.bi_valid >= 8) {
      s.pending_buf[s.pending++] = s.bi_buf & 0xff;
      s.bi_buf >>= 8;
      s.bi_valid -= 8;
    }
  }

  function gen_bitlen(s, desc) {
    var tree = desc.dyn_tree;
    var max_code = desc.max_code;
    var stree = desc.stat_desc.static_tree;
    var has_stree = desc.stat_desc.has_stree;
    var extra = desc.stat_desc.extra_bits;
    var base = desc.stat_desc.extra_base;
    var max_length = desc.stat_desc.max_length;
    var h;
    var n;
    var m;
    var bits;
    var xbits;
    var f;
    var overflow = 0;

    for (bits = 0; bits <= MAX_BITS; bits++) {
      s.bl_count[bits] = 0;
    }

    tree[s.heap[s.heap_max] * 2 + 1] = 0;

    for (h = s.heap_max + 1; h < HEAP_SIZE; h++) {
      n = s.heap[h];
      bits = tree[tree[n * 2 + 1] * 2 + 1] + 1;
      if (bits > max_length) {
        bits = max_length;
        overflow++;
      }
      tree[n * 2 + 1] = bits;

      if (n > max_code) {
        continue;
      }

      s.bl_count[bits]++;
      xbits = 0;
      if (n >= base) {
        xbits = extra[n - base];
      }
      f = tree[n * 2];
      s.opt_len += f * (bits + xbits);
      if (has_stree) {
        s.static_len += f * (stree[n * 2 + 1] + xbits);
      }
    }
    if (overflow === 0) {
      return;
    }

    do {
      bits = max_length - 1;
      while (s.bl_count[bits] === 0) {
        bits--;
      }
      s.bl_count[bits]--;
      s.bl_count[bits + 1] += 2;
      s.bl_count[max_length]--;

      overflow -= 2;
    } while (overflow > 0);

    for (bits = max_length; bits !== 0; bits--) {
      n = s.bl_count[bits];
      while (n !== 0) {
        m = s.heap[--h];
        if (m > max_code) {
          continue;
        }
        if (tree[m * 2 + 1] !== bits) {
          s.opt_len += (bits - tree[m * 2 + 1]) * tree[m * 2];
          tree[m * 2 + 1] = bits;
        }
        n--;
      }
    }
  }

  function gen_codes(tree, max_code, bl_count) {
    var next_code = new Array(MAX_BITS + 1);
    var code = 0;
    var bits;
    var n;

    for (bits = 1; bits <= MAX_BITS; bits++) {
      next_code[bits] = code = (code + bl_count[bits - 1]) << 1;
    }

    for (n = 0; n <= max_code; n++) {
      var len = tree[n * 2 + 1];
      if (len === 0) {
        continue;
      }

      tree[n * 2] = bi_reverse(next_code[len]++, len);
    }
  }

  function tr_static_init() {
    var n;
    var bits;
    var length;
    var code;
    var dist;
    var bl_count = new Array(MAX_BITS + 1);

    length = 0;
    for (code = 0; code < LENGTH_CODES - 1; code++) {
      base_length[code] = length;
      for (n = 0; n < 1 << extra_lbits[code]; n++) {
        _length_code[length++] = code;
      }
    }

    _length_code[length - 1] = code;

    dist = 0;
    for (code = 0; code < 16; code++) {
      base_dist[code] = dist;
      for (n = 0; n < 1 << extra_dbits[code]; n++) {
        _dist_code[dist++] = code;
      }
    }

    dist >>= 7;
    for (; code < D_CODES; code++) {
      base_dist[code] = dist << 7;
      for (n = 0; n < 1 << (extra_dbits[code] - 7); n++) {
        _dist_code[256 + dist++] = code;
      }
    }

    for (bits = 0; bits <= MAX_BITS; bits++) {
      bl_count[bits] = 0;
    }

    n = 0;
    while (n <= 143) {
      static_ltree[n * 2 + 1] = 8;
      n++;
      bl_count[8]++;
    }
    while (n <= 255) {
      static_ltree[n * 2 + 1] = 9;
      n++;
      bl_count[9]++;
    }
    while (n <= 279) {
      static_ltree[n * 2 + 1] = 7;
      n++;
      bl_count[7]++;
    }
    while (n <= 287) {
      static_ltree[n * 2 + 1] = 8;
      n++;
      bl_count[8]++;
    }

    gen_codes(static_ltree, L_CODES + 1, bl_count);

    for (n = 0; n < D_CODES; n++) {
      static_dtree[n * 2 + 1] = 5;
      static_dtree[n * 2] = bi_reverse(n, 5);
    }

    static_l_desc = new StaticTreeDesc(static_ltree, extra_lbits, LITERALS + 1, L_CODES, MAX_BITS);
    static_d_desc = new StaticTreeDesc(static_dtree, extra_dbits, 0, D_CODES, MAX_BITS);
    static_bl_desc = new StaticTreeDesc(new Array(0), extra_blbits, 0, BL_CODES, MAX_BL_BITS);
  }

  function init_block(s) {
    var n;

    for (n = 0; n < L_CODES; n++) {
      s.dyn_ltree[n * 2] = 0;
    }
    for (n = 0; n < D_CODES; n++) {
      s.dyn_dtree[n * 2] = 0;
    }
    for (n = 0; n < BL_CODES; n++) {
      s.bl_tree[n * 2] = 0;
    }

    s.dyn_ltree[END_BLOCK * 2] = 1;
    s.opt_len = s.static_len = 0;
    s.last_lit = s.matches = 0;
  }

  function bi_windup(s) {
    if (s.bi_valid > 8) {
      put_short(s, s.bi_buf);
    } else if (s.bi_valid > 0) {
      s.pending_buf[s.pending++] = s.bi_buf;
    }
    s.bi_buf = 0;
    s.bi_valid = 0;
  }

  function copy_block(s, buf, len, header) {
    bi_windup(s);

    if (header) {
      put_short(s, len);
      put_short(s, ~len);
    }

    arraySet(s.pending_buf, s.window, buf, len, s.pending);
    s.pending += len;
  }

  function smaller(tree, n, m, depth) {
    var _n2 = n * 2;
    var _m2 = m * 2;
    return tree[_n2] < tree[_m2] || (tree[_n2] === tree[_m2] && depth[n] <= depth[m]);
  }

  function pqdownheap(s, tree, k) {
    var v = s.heap[k];
    var j = k << 1;
    while (j <= s.heap_len) {
      if (j < s.heap_len && smaller(tree, s.heap[j + 1], s.heap[j], s.depth)) {
        j++;
      }

      if (smaller(tree, v, s.heap[j], s.depth)) {
        break;
      }

      s.heap[k] = s.heap[j];
      k = j;

      j <<= 1;
    }
    s.heap[k] = v;
  }

  function compress_block(s, ltree, dtree) {
    var dist;
    var lc;
    var lx = 0;
    var code;
    var extra;

    if (s.last_lit !== 0) {
      do {
        dist = (s.pending_buf[s.d_buf + lx * 2] << 8) | s.pending_buf[s.d_buf + lx * 2 + 1];
        lc = s.pending_buf[s.l_buf + lx];
        lx++;

        if (dist === 0) {
          send_code(s, lc, ltree);
        } else {
          code = _length_code[lc];
          send_code(s, code + LITERALS + 1, ltree);
          extra = extra_lbits[code];
          if (extra !== 0) {
            lc -= base_length[code];
            send_bits(s, lc, extra);
          }
          dist--;
          code = d_code(dist);

          send_code(s, code, dtree);
          extra = extra_dbits[code];
          if (extra !== 0) {
            dist -= base_dist[code];
            send_bits(s, dist, extra);
          }
        }
      } while (lx < s.last_lit);
    }

    send_code(s, END_BLOCK, ltree);
  }

  function build_tree(s, desc) {
    var tree = desc.dyn_tree;
    var stree = desc.stat_desc.static_tree;
    var has_stree = desc.stat_desc.has_stree;
    var elems = desc.stat_desc.elems;
    var n;
    var m;
    var max_code = -1;
    var node;

    s.heap_len = 0;
    s.heap_max = HEAP_SIZE;

    for (n = 0; n < elems; n++) {
      if (tree[n * 2] !== 0) {
        s.heap[++s.heap_len] = max_code = n;
        s.depth[n] = 0;
      } else {
        tree[n * 2 + 1] = 0;
      }
    }

    while (s.heap_len < 2) {
      node = s.heap[++s.heap_len] = max_code < 2 ? ++max_code : 0;
      tree[node * 2] = 1;
      s.depth[node] = 0;
      s.opt_len--;

      if (has_stree) {
        s.static_len -= stree[node * 2 + 1];
      }
    }
    desc.max_code = max_code;

    for (n = s.heap_len >> 1; n >= 1; n--) {
      pqdownheap(s, tree, n);
    }

    node = elems;
    do {
      n = s.heap[1];
      s.heap[1] = s.heap[s.heap_len--];
      pqdownheap(s, tree, 1);

      m = s.heap[1];

      s.heap[--s.heap_max] = n;
      s.heap[--s.heap_max] = m;

      tree[node * 2] = tree[n * 2] + tree[m * 2];
      s.depth[node] = (s.depth[n] >= s.depth[m] ? s.depth[n] : s.depth[m]) + 1;
      tree[n * 2 + 1] = tree[m * 2 + 1] = node;

      s.heap[1] = node++;
      pqdownheap(s, tree, 1);
    } while (s.heap_len >= 2);

    s.heap[--s.heap_max] = s.heap[1];

    gen_bitlen(s, desc);

    gen_codes(tree, max_code, s.bl_count);
  }

  function scan_tree(s, tree, max_code) {
    var n;
    var prevlen = -1;
    var curlen;

    var nextlen = tree[0 * 2 + 1];

    var count = 0;
    var max_count = 7;
    var min_count = 4;

    if (nextlen === 0) {
      max_count = 138;
      min_count = 3;
    }
    tree[(max_code + 1) * 2 + 1] = 0xffff;

    for (n = 0; n <= max_code; n++) {
      curlen = nextlen;
      nextlen = tree[(n + 1) * 2 + 1];

      if (++count < max_count && curlen === nextlen) {
        continue;
      } else if (count < min_count) {
        s.bl_tree[curlen * 2] += count;
      } else if (curlen !== 0) {
        if (curlen !== prevlen) {
          s.bl_tree[curlen * 2]++;
        }
        s.bl_tree[REP_3_6 * 2]++;
      } else if (count <= 10) {
        s.bl_tree[REPZ_3_10 * 2]++;
      } else {
        s.bl_tree[REPZ_11_138 * 2]++;
      }

      count = 0;
      prevlen = curlen;

      if (nextlen === 0) {
        max_count = 138;
        min_count = 3;
      } else if (curlen === nextlen) {
        max_count = 6;
        min_count = 3;
      } else {
        max_count = 7;
        min_count = 4;
      }
    }
  }

  function send_tree(s, tree, max_code) {
    var n;
    var prevlen = -1;
    var curlen;

    var nextlen = tree[0 * 2 + 1];

    var count = 0;
    var max_count = 7;
    var min_count = 4;

    if (nextlen === 0) {
      max_count = 138;
      min_count = 3;
    }

    for (n = 0; n <= max_code; n++) {
      curlen = nextlen;
      nextlen = tree[(n + 1) * 2 + 1];

      if (++count < max_count && curlen === nextlen) {
        continue;
      } else if (count < min_count) {
        do {
          send_code(s, curlen, s.bl_tree);
        } while (--count !== 0);
      } else if (curlen !== 0) {
        if (curlen !== prevlen) {
          send_code(s, curlen, s.bl_tree);
          count--;
        }

        send_code(s, REP_3_6, s.bl_tree);
        send_bits(s, count - 3, 2);
      } else if (count <= 10) {
        send_code(s, REPZ_3_10, s.bl_tree);
        send_bits(s, count - 3, 3);
      } else {
        send_code(s, REPZ_11_138, s.bl_tree);
        send_bits(s, count - 11, 7);
      }

      count = 0;
      prevlen = curlen;
      if (nextlen === 0) {
        max_count = 138;
        min_count = 3;
      } else if (curlen === nextlen) {
        max_count = 6;
        min_count = 3;
      } else {
        max_count = 7;
        min_count = 4;
      }
    }
  }

  function build_bl_tree(s) {
    var max_blindex;

    scan_tree(s, s.dyn_ltree, s.l_desc.max_code);
    scan_tree(s, s.dyn_dtree, s.d_desc.max_code);

    build_tree(s, s.bl_desc);

    for (max_blindex = BL_CODES - 1; max_blindex >= 3; max_blindex--) {
      if (s.bl_tree[bl_order[max_blindex] * 2 + 1] !== 0) {
        break;
      }
    }

    s.opt_len += 3 * (max_blindex + 1) + 5 + 5 + 4;

    return max_blindex;
  }

  function send_all_trees(s, lcodes, dcodes, blcodes) {
    var rank;

    send_bits(s, lcodes - 257, 5);
    send_bits(s, dcodes - 1, 5);
    send_bits(s, blcodes - 4, 4);
    for (rank = 0; rank < blcodes; rank++) {
      send_bits(s, s.bl_tree[bl_order[rank] * 2 + 1], 3);
    }

    send_tree(s, s.dyn_ltree, lcodes - 1);

    send_tree(s, s.dyn_dtree, dcodes - 1);
  }

  function detect_data_type(s) {
    var black_mask = 0xf3ffc07f;
    var n;

    for (n = 0; n <= 31; n++, black_mask >>>= 1) {
      if (black_mask & 1 && s.dyn_ltree[n * 2] !== 0) {
        return Z_BINARY;
      }
    }

    if (s.dyn_ltree[9 * 2] !== 0 || s.dyn_ltree[10 * 2] !== 0 || s.dyn_ltree[13 * 2] !== 0) {
      return Z_TEXT;
    }
    for (n = 32; n < LITERALS; n++) {
      if (s.dyn_ltree[n * 2] !== 0) {
        return Z_TEXT;
      }
    }

    return Z_BINARY;
  }

  var static_init_done = false;

  function _tr_init(s) {
    if (!static_init_done) {
      tr_static_init();
      static_init_done = true;
    }

    s.l_desc = new TreeDesc(s.dyn_ltree, static_l_desc);
    s.d_desc = new TreeDesc(s.dyn_dtree, static_d_desc);
    s.bl_desc = new TreeDesc(s.bl_tree, static_bl_desc);

    s.bi_buf = 0;
    s.bi_valid = 0;

    init_block(s);
  }

  function _tr_stored_block(s, buf, stored_len, last) {
    send_bits(s, (STORED_BLOCK << 1) + (last ? 1 : 0), 3);
    copy_block(s, buf, stored_len, true);
  }

  function _tr_align(s) {
    send_bits(s, STATIC_TREES << 1, 3);
    send_code(s, END_BLOCK, static_ltree);
    bi_flush(s);
  }

  function _tr_flush_block(s, buf, stored_len, last) {
    var opt_lenb;
    var static_lenb;
    var max_blindex = 0;

    if (s.level > 0) {
      if (s.strm.data_type === Z_UNKNOWN) {
        s.strm.data_type = detect_data_type(s);
      }

      build_tree(s, s.l_desc);

      build_tree(s, s.d_desc);

      max_blindex = build_bl_tree(s);

      opt_lenb = (s.opt_len + 3 + 7) >>> 3;
      static_lenb = (s.static_len + 3 + 7) >>> 3;

      if (static_lenb <= opt_lenb) {
        opt_lenb = static_lenb;
      }
    } else {
      opt_lenb = static_lenb = stored_len + 5;
    }

    if (stored_len + 4 <= opt_lenb && buf !== -1) {
      _tr_stored_block(s, buf, stored_len, last);
    } else if (s.strategy === Z_FIXED || static_lenb === opt_lenb) {
      send_bits(s, (STATIC_TREES << 1) + (last ? 1 : 0), 3);
      compress_block(s, static_ltree, static_dtree);
    } else {
      send_bits(s, (DYN_TREES << 1) + (last ? 1 : 0), 3);
      send_all_trees(s, s.l_desc.max_code + 1, s.d_desc.max_code + 1, max_blindex + 1);
      compress_block(s, s.dyn_ltree, s.dyn_dtree);
    }

    init_block(s);

    if (last) {
      bi_windup(s);
    }
  }

  function _tr_tally(s, dist, lc) {
    s.pending_buf[s.d_buf + s.last_lit * 2] = (dist >>> 8) & 0xff;
    s.pending_buf[s.d_buf + s.last_lit * 2 + 1] = dist & 0xff;

    s.pending_buf[s.l_buf + s.last_lit] = lc & 0xff;
    s.last_lit++;

    if (dist === 0) {
      s.dyn_ltree[lc * 2]++;
    } else {
      s.matches++;

      dist--;

      s.dyn_ltree[(_length_code[lc] + LITERALS + 1) * 2]++;
      s.dyn_dtree[d_code(dist) * 2]++;
    }

    return s.last_lit === s.lit_bufsize - 1;
  }

  var msg = {
    2: "need dictionary",
    1: "stream end",
    0: "",
    "-1": "file error",
    "-2": "stream error",
    "-3": "data error",
    "-4": "insufficient memory",
    "-5": "buffer error",
    "-6": "incompatible version",
  };

  var Z_NO_FLUSH = 0;
  var Z_PARTIAL_FLUSH = 1;

  var Z_FULL_FLUSH = 3;
  var Z_FINISH = 4;
  var Z_BLOCK = 5;

  var Z_OK = 0;
  var Z_STREAM_END = 1;

  var Z_STREAM_ERROR = -2;
  var Z_DATA_ERROR = -3;

  var Z_BUF_ERROR = -5;

  var Z_DEFAULT_COMPRESSION = -1;

  var Z_FILTERED = 1;
  var Z_FIXED$1 = 4;

  var Z_UNKNOWN$1 = 2;

  var Z_DEFLATED = 8;

  var MAX_MEM_LEVEL = 9;

  var LENGTH_CODES$1 = 29;

  var LITERALS$1 = 256;

  var L_CODES$1 = LITERALS$1 + 1 + LENGTH_CODES$1;

  var D_CODES$1 = 30;

  var BL_CODES$1 = 19;

  var HEAP_SIZE$1 = 2 * L_CODES$1 + 1;

  var MAX_BITS$1 = 15;

  var MIN_MATCH$1 = 3;
  var MAX_MATCH$1 = 258;
  var MIN_LOOKAHEAD = MAX_MATCH$1 + MIN_MATCH$1 + 1;

  var INIT_STATE = 42;
  var EXTRA_STATE = 69;
  var NAME_STATE = 73;
  var COMMENT_STATE = 91;
  var HCRC_STATE = 103;
  var BUSY_STATE = 113;
  var FINISH_STATE = 666;

  var BS_NEED_MORE = 1;
  var BS_BLOCK_DONE = 2;
  var BS_FINISH_STARTED = 3;
  var BS_FINISH_DONE = 4;

  function err(strm, errorCode) {
    strm.msg = msg[errorCode];
    return errorCode;
  }

  function rank(f) {
    return (f << 1) - (f > 4 ? 9 : 0);
  }

  function zero$1(buf) {
    var len = buf.length;
    while (--len >= 0) {
      buf[len] = 0;
    }
  }

  function flush_pending(strm) {
    var s = strm.state;

    var len = s.pending;
    if (len > strm.avail_out) {
      len = strm.avail_out;
    }
    if (len === 0) {
      return;
    }

    arraySet(strm.output, s.pending_buf, s.pending_out, len, strm.next_out);
    strm.next_out += len;
    s.pending_out += len;
    strm.total_out += len;
    strm.avail_out -= len;
    s.pending -= len;
    if (s.pending === 0) {
      s.pending_out = 0;
    }
  }

  function flush_block_only(s, last) {
    _tr_flush_block(s, s.block_start >= 0 ? s.block_start : -1, s.strstart - s.block_start, last);
    s.block_start = s.strstart;
    flush_pending(s.strm);
  }

  function read_buf(strm, buf, start, size) {
    var len = strm.avail_in;

    if (len > size) {
      len = size;
    }
    if (len === 0) {
      return 0;
    }

    strm.avail_in -= len;

    arraySet(buf, strm.input, strm.next_in, len, start);
    if (strm.state.wrap === 1) {
      /* pragma:DEBUG_START */
      throw new Error("crc stupport removed");
      /* pragma:DEBUG_END */
    } else if (strm.state.wrap === 2) {
      /* pragma:DEBUG_START */
      throw new Error("crc stupport removed");
      /* pragma:DEBUG_END */
    }

    strm.next_in += len;
    strm.total_in += len;

    return len;
  }

  function longest_match(s, cur_match) {
    var chain_length = s.max_chain_length;
    var scan = s.strstart;
    var match;
    var len;
    var best_len = s.prev_length;
    var nice_match = s.nice_match;
    var limit = s.strstart > s.w_size - MIN_LOOKAHEAD ? s.strstart - (s.w_size - MIN_LOOKAHEAD) : 0;

    var _win = s.window;

    var wmask = s.w_mask;
    var prev = s.prev;

    var strend = s.strstart + MAX_MATCH$1;
    var scan_end1 = _win[scan + best_len - 1];
    var scan_end = _win[scan + best_len];

    if (s.prev_length >= s.good_match) {
      chain_length >>= 2;
    }

    if (nice_match > s.lookahead) {
      nice_match = s.lookahead;
    }

    do {
      match = cur_match;

      if (
        _win[match + best_len] !== scan_end ||
        _win[match + best_len - 1] !== scan_end1 ||
        _win[match] !== _win[scan] ||
        _win[++match] !== _win[scan + 1]
      ) {
        continue;
      }

      scan += 2;
      match++;

      do {} while (
        _win[++scan] === _win[++match] &&
        _win[++scan] === _win[++match] &&
        _win[++scan] === _win[++match] &&
        _win[++scan] === _win[++match] &&
        _win[++scan] === _win[++match] &&
        _win[++scan] === _win[++match] &&
        _win[++scan] === _win[++match] &&
        _win[++scan] === _win[++match] &&
        scan < strend
      );

      len = MAX_MATCH$1 - (strend - scan);
      scan = strend - MAX_MATCH$1;

      if (len > best_len) {
        s.match_start = cur_match;
        best_len = len;
        if (len >= nice_match) {
          break;
        }
        scan_end1 = _win[scan + best_len - 1];
        scan_end = _win[scan + best_len];
      }
    } while ((cur_match = prev[cur_match & wmask]) > limit && --chain_length !== 0);

    if (best_len <= s.lookahead) {
      return best_len;
    }
    return s.lookahead;
  }

  function fill_window(s) {
    var _w_size = s.w_size;
    var p;
    var n;
    var m;
    var more;
    var str;

    do {
      more = s.window_size - s.lookahead - s.strstart;

      if (s.strstart >= _w_size + (_w_size - MIN_LOOKAHEAD)) {
        arraySet(s.window, s.window, _w_size, _w_size, 0);
        s.match_start -= _w_size;
        s.strstart -= _w_size;

        s.block_start -= _w_size;

        n = s.hash_size;
        p = n;
        do {
          m = s.head[--p];
          s.head[p] = m >= _w_size ? m - _w_size : 0;
        } while (--n);

        n = _w_size;
        p = n;
        do {
          m = s.prev[--p];
          s.prev[p] = m >= _w_size ? m - _w_size : 0;
        } while (--n);

        more += _w_size;
      }
      if (s.strm.avail_in === 0) {
        break;
      }

      n = read_buf(s.strm, s.window, s.strstart + s.lookahead, more);
      s.lookahead += n;

      if (s.lookahead + s.insert >= MIN_MATCH$1) {
        str = s.strstart - s.insert;
        s.ins_h = s.window[str];

        s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[str + 1]) & s.hash_mask;

        while (s.insert) {
          s.ins_h = ((s.ins_h << s.hash_shift) ^ s.window[str + MIN_MATCH$1 - 1]) & s.hash_mask;

          s.prev[str & s.w_mask] = s.head[s.ins_h];
          s.head[s.ins_h] = str;
          str++;
          s.insert--;
          if (s.lookahead + s.insert < MIN_MATCH$1) {
            break;
          }
        }
      }
    } while (s.lookahead < MIN_LOOKAHEAD && s.strm.avail_in !== 0);
  }

  function deflate_slow(s, flush) {
    var hash_head;
    var bflush;

    var max_insert;

    for (;;) {
      if (s.lookahead < MIN_LOOKAHEAD) {
        fill_window(s);
        if (s.lookahead < MIN_LOOKAHEAD && flush === Z_NO_FLUSH) {
          return BS_NEED_MORE;
        }
        if (s.lookahead === 0) {
          break;
        }
      }

      hash_head = 0;
      if (s.lookahead >= MIN_MATCH$1) {
        s.ins_h =
          ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + MIN_MATCH$1 - 1]) & s.hash_mask;
        hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
        s.head[s.ins_h] = s.strstart;
      }

      s.prev_length = s.match_length;
      s.prev_match = s.match_start;
      s.match_length = MIN_MATCH$1 - 1;

      if (
        hash_head !== 0 &&
        s.prev_length < s.max_lazy_match &&
        s.strstart - hash_head <= s.w_size - MIN_LOOKAHEAD
      ) {
        s.match_length = longest_match(s, hash_head);

        if (
          s.match_length <= 5 &&
          (s.strategy === Z_FILTERED ||
            (s.match_length === MIN_MATCH$1 && s.strstart - s.match_start > 4096))
        ) {
          s.match_length = MIN_MATCH$1 - 1;
        }
      }

      if (s.prev_length >= MIN_MATCH$1 && s.match_length <= s.prev_length) {
        max_insert = s.strstart + s.lookahead - MIN_MATCH$1;

        bflush = _tr_tally(s, s.strstart - 1 - s.prev_match, s.prev_length - MIN_MATCH$1);

        s.lookahead -= s.prev_length - 1;
        s.prev_length -= 2;
        do {
          if (++s.strstart <= max_insert) {
            s.ins_h =
              ((s.ins_h << s.hash_shift) ^ s.window[s.strstart + MIN_MATCH$1 - 1]) & s.hash_mask;
            hash_head = s.prev[s.strstart & s.w_mask] = s.head[s.ins_h];
            s.head[s.ins_h] = s.strstart;
          }
        } while (--s.prev_length !== 0);
        s.match_available = 0;
        s.match_length = MIN_MATCH$1 - 1;
        s.strstart++;

        if (bflush) {
          flush_block_only(s, false);
          if (s.strm.avail_out === 0) {
            return BS_NEED_MORE;
          }
        }
      } else if (s.match_available) {
        bflush = _tr_tally(s, 0, s.window[s.strstart - 1]);

        if (bflush) {
          flush_block_only(s, false);
        }
        s.strstart++;
        s.lookahead--;
        if (s.strm.avail_out === 0) {
          return BS_NEED_MORE;
        }
      } else {
        s.match_available = 1;
        s.strstart++;
        s.lookahead--;
      }
    }

    if (s.match_available) {
      bflush = _tr_tally(s, 0, s.window[s.strstart - 1]);

      s.match_available = 0;
    }
    s.insert = s.strstart < MIN_MATCH$1 - 1 ? s.strstart : MIN_MATCH$1 - 1;
    if (flush === Z_FINISH) {
      flush_block_only(s, true);
      if (s.strm.avail_out === 0) {
        return BS_FINISH_STARTED;
      }

      return BS_FINISH_DONE;
    }
    if (s.last_lit) {
      flush_block_only(s, false);
      if (s.strm.avail_out === 0) {
        return BS_NEED_MORE;
      }
    }

    return BS_BLOCK_DONE;
  }

  function Config(good_length, max_lazy, nice_length, max_chain, func) {
    this.good_length = good_length;
    this.max_lazy = max_lazy;
    this.nice_length = nice_length;
    this.max_chain = max_chain;
    this.func = func;
  }

  var configuration_table;

  configuration_table = [
    // new Config(0, 0, 0, 0, deflate_stored),
    // new Config(4, 4, 8, 4, deflate_fast),
    // new Config(4, 5, 16, 8, deflate_fast),
    // new Config(4, 6, 32, 32, deflate_fast),

    // no support for level 1, 2, 3, 4 -- only level 5+
    null,
    null,
    null,
    null,

    new Config(4, 4, 16, 16, deflate_slow),
    new Config(8, 16, 32, 32, deflate_slow),
    new Config(8, 16, 128, 128, deflate_slow),
    new Config(8, 32, 128, 256, deflate_slow),
    new Config(32, 128, 258, 1024, deflate_slow),
    new Config(32, 258, 258, 4096, deflate_slow),
  ];

  function lm_init(s) {
    s.window_size = 2 * s.w_size;

    zero$1(s.head);

    s.max_lazy_match = configuration_table[s.level].max_lazy;
    s.good_match = configuration_table[s.level].good_length;
    s.nice_match = configuration_table[s.level].nice_length;
    s.max_chain_length = configuration_table[s.level].max_chain;

    s.strstart = 0;
    s.block_start = 0;
    s.lookahead = 0;
    s.insert = 0;
    s.match_length = s.prev_length = MIN_MATCH$1 - 1;
    s.match_available = 0;
    s.ins_h = 0;
  }

  function DeflateState() {
    this.strm = null;
    this.status = 0;
    this.pending_buf = null;
    this.pending_buf_size = 0;
    this.pending_out = 0;
    this.pending = 0;
    this.wrap = 0;
    this.gzhead = null;
    this.gzindex = 0;
    this.method = Z_DEFLATED;
    this.last_flush = -1;

    this.w_size = 0;
    this.w_bits = 0;
    this.w_mask = 0;

    this.window = null;

    this.window_size = 0;

    this.prev = null;

    this.head = null;

    this.ins_h = 0;
    this.hash_size = 0;
    this.hash_bits = 0;
    this.hash_mask = 0;

    this.hash_shift = 0;

    this.block_start = 0;

    this.match_length = 0;
    this.prev_match = 0;
    this.match_available = 0;
    this.strstart = 0;
    this.match_start = 0;
    this.lookahead = 0;

    this.prev_length = 0;

    this.max_chain_length = 0;

    this.max_lazy_match = 0;

    this.level = 0;
    this.strategy = 0;

    this.good_match = 0;

    this.nice_match = 0;

    this.dyn_ltree = new Buf16(HEAP_SIZE$1 * 2);
    this.dyn_dtree = new Buf16((2 * D_CODES$1 + 1) * 2);
    this.bl_tree = new Buf16((2 * BL_CODES$1 + 1) * 2);
    zero$1(this.dyn_ltree);
    zero$1(this.dyn_dtree);
    zero$1(this.bl_tree);

    this.l_desc = null;
    this.d_desc = null;
    this.bl_desc = null;

    this.bl_count = new Buf16(MAX_BITS$1 + 1);

    this.heap = new Buf16(2 * L_CODES$1 + 1);
    zero$1(this.heap);

    this.heap_len = 0;
    this.heap_max = 0;

    this.depth = new Buf16(2 * L_CODES$1 + 1);
    zero$1(this.depth);

    this.l_buf = 0;

    this.lit_bufsize = 0;

    this.last_lit = 0;

    this.d_buf = 0;

    this.opt_len = 0;
    this.static_len = 0;
    this.matches = 0;
    this.insert = 0;

    this.bi_buf = 0;

    this.bi_valid = 0;
  }

  function deflateResetKeep(strm) {
    var s;

    if (!strm || !strm.state) {
      return err(strm, Z_STREAM_ERROR);
    }

    strm.total_in = strm.total_out = 0;
    strm.data_type = Z_UNKNOWN$1;

    s = strm.state;
    s.pending = 0;
    s.pending_out = 0;

    if (s.wrap < 0) {
      s.wrap = -s.wrap;
    }
    s.status = s.wrap ? INIT_STATE : BUSY_STATE;
    strm.adler = s.wrap === 2 ? 0 : 1;
    s.last_flush = Z_NO_FLUSH;
    _tr_init(s);
    return Z_OK;
  }

  function deflateReset(strm) {
    var ret = deflateResetKeep(strm);
    if (ret === Z_OK) {
      lm_init(strm.state);
    }
    return ret;
  }

  function deflateInit2(strm, level, method, windowBits, memLevel, strategy) {
    if (!strm) {
      return Z_STREAM_ERROR;
    }
    var wrap = 1;

    if (level === Z_DEFAULT_COMPRESSION) {
      level = 6;
    }

    if (windowBits < 0) {
      wrap = 0;
      windowBits = -windowBits;
    } else if (windowBits > 15) {
      wrap = 2;
      windowBits -= 16;
    }

    if (
      memLevel < 1 ||
      memLevel > MAX_MEM_LEVEL ||
      method !== Z_DEFLATED ||
      windowBits < 8 ||
      windowBits > 15 ||
      level < 0 ||
      level > 9 ||
      strategy < 0 ||
      strategy > Z_FIXED$1
    ) {
      return err(strm, Z_STREAM_ERROR);
    }

    if (windowBits === 8) {
      windowBits = 9;
    }

    var s = new DeflateState();

    strm.state = s;
    s.strm = strm;

    s.wrap = wrap;
    s.gzhead = null;
    s.w_bits = windowBits;
    s.w_size = 1 << s.w_bits;
    s.w_mask = s.w_size - 1;

    s.hash_bits = memLevel + 7;
    s.hash_size = 1 << s.hash_bits;
    s.hash_mask = s.hash_size - 1;
    s.hash_shift = ~~((s.hash_bits + MIN_MATCH$1 - 1) / MIN_MATCH$1);

    s.window = new Buf8(s.w_size * 2);
    s.head = new Buf16(s.hash_size);
    s.prev = new Buf16(s.w_size);

    s.lit_bufsize = 1 << (memLevel + 6);

    s.pending_buf_size = s.lit_bufsize * 4;

    s.pending_buf = new Buf8(s.pending_buf_size);

    s.d_buf = 1 * s.lit_bufsize;

    s.l_buf = (1 + 2) * s.lit_bufsize;

    s.level = level;
    s.strategy = strategy;
    s.method = method;

    return deflateReset(strm);
  }

  function deflate(strm, flush) {
    var old_flush;
    var s;

    if (!strm || !strm.state || flush > Z_BLOCK || flush < 0) {
      return strm ? err(strm, Z_STREAM_ERROR) : Z_STREAM_ERROR;
    }

    s = strm.state;

    if (
      !strm.output ||
      (!strm.input && strm.avail_in !== 0) ||
      (s.status === FINISH_STATE && flush !== Z_FINISH)
    ) {
      return err(strm, strm.avail_out === 0 ? Z_BUF_ERROR : Z_STREAM_ERROR);
    }

    s.strm = strm;
    old_flush = s.last_flush;
    s.last_flush = flush;

    if (s.status === INIT_STATE) {
      /* pragma:DEBUG_START */
      throw new Error("gzip stupport removed");
      /* pragma:DEBUG_END */
    }

    if (s.status === EXTRA_STATE) {
      /* pragma:DEBUG_START */
      throw new Error("gzip stupport removed");
      /* pragma:DEBUG_END */
    }
    if (s.status === NAME_STATE) {
      /* pragma:DEBUG_START */
      throw new Error("gzip stupport removed");
      /* pragma:DEBUG_END */
    }
    if (s.status === COMMENT_STATE) {
      /* pragma:DEBUG_START */
      throw new Error("gzip stupport removed");
      /* pragma:DEBUG_END */
    }
    if (s.status === HCRC_STATE) {
      /* pragma:DEBUG_START */
      throw new Error("gzip stupport removed");
      /* pragma:DEBUG_END */
    }

    if (s.pending !== 0) {
      flush_pending(strm);
      if (strm.avail_out === 0) {
        s.last_flush = -1;
        return Z_OK;
      }
    } else if (strm.avail_in === 0 && rank(flush) <= rank(old_flush) && flush !== Z_FINISH) {
      return err(strm, Z_BUF_ERROR);
    }

    if (s.status === FINISH_STATE && strm.avail_in !== 0) {
      return err(strm, Z_BUF_ERROR);
    }

    if (
      strm.avail_in !== 0 ||
      s.lookahead !== 0 ||
      (flush !== Z_NO_FLUSH && s.status !== FINISH_STATE)
    ) {
      // var bstate =
      //   s.strategy === Z_HUFFMAN_ONLY
      //     ? deflate_huff(s, flush)
      //     : s.strategy === Z_RLE
      //     ? deflate_rle(s, flush)
      //     : configuration_table[s.level].func(s, flush);

      // no support for deflate_huff and deflate_rle
      var bstate = configuration_table[s.level].func(s, flush);

      if (bstate === BS_FINISH_STARTED || bstate === BS_FINISH_DONE) {
        s.status = FINISH_STATE;
      }
      if (bstate === BS_NEED_MORE || bstate === BS_FINISH_STARTED) {
        if (strm.avail_out === 0) {
          s.last_flush = -1;
        }
        return Z_OK;
      }
      if (bstate === BS_BLOCK_DONE) {
        if (flush === Z_PARTIAL_FLUSH) {
          _tr_align(s);
        } else if (flush !== Z_BLOCK) {
          _tr_stored_block(s, 0, 0, false);

          if (flush === Z_FULL_FLUSH) {
            zero$1(s.head);

            if (s.lookahead === 0) {
              s.strstart = 0;
              s.block_start = 0;
              s.insert = 0;
            }
          }
        }
        flush_pending(strm);
        if (strm.avail_out === 0) {
          s.last_flush = -1;
          return Z_OK;
        }
      }
    }

    if (flush !== Z_FINISH) {
      return Z_OK;
    }
    if (s.wrap <= 0) {
      return Z_STREAM_END;
    }

    /* pragma:DEBUG_START */
    throw new Error("gzip stupport removed");
    /* pragma:DEBUG_END */
  }

  function deflateEnd(strm) {
    var status;

    if (!strm || !strm.state) {
      return Z_STREAM_ERROR;
    }

    status = strm.state.status;
    if (
      status !== INIT_STATE &&
      status !== EXTRA_STATE &&
      status !== NAME_STATE &&
      status !== COMMENT_STATE &&
      status !== HCRC_STATE &&
      status !== BUSY_STATE &&
      status !== FINISH_STATE
    ) {
      return err(strm, Z_STREAM_ERROR);
    }

    strm.state = null;

    return status === BUSY_STATE ? err(strm, Z_DATA_ERROR) : Z_OK;
  }

  var STR_APPLY_OK = true;
  var STR_APPLY_UIA_OK = true;

  try {
    String.fromCharCode.apply(null, [0]);
  } catch (__) {
    STR_APPLY_OK = false;
  }
  try {
    String.fromCharCode.apply(null, new Uint8Array(1));
  } catch (__) {
    STR_APPLY_UIA_OK = false;
  }

  var _utf8len = new Buf8(256);
  for (var q = 0; q < 256; q++) {
    _utf8len[q] = q >= 252 ? 6 : q >= 248 ? 5 : q >= 240 ? 4 : q >= 224 ? 3 : q >= 192 ? 2 : 1;
  }
  _utf8len[254] = _utf8len[254] = 1;

  function buf2binstring2(buf, len) {
    if (len < 65537) {
      if ((buf.subarray && STR_APPLY_UIA_OK) || (!buf.subarray && STR_APPLY_OK)) {
        return String.fromCharCode.apply(null, shrinkBuf(buf, len));
      }
    }

    var result = "";
    for (var i = 0; i < len; i++) {
      result += String.fromCharCode(buf[i]);
    }
    return result;
  }

  function buf2binstring(buf) {
    return buf2binstring2(buf, buf.length);
  }

  function binstring2buf(str) {
    var buf = new Buf8(str.length);
    for (var i = 0, len = buf.length; i < len; i++) {
      buf[i] = str.charCodeAt(i);
    }
    return buf;
  }

  function ZStream() {
    this.input = null;
    this.next_in = 0;

    this.avail_in = 0;

    this.total_in = 0;

    this.output = null;
    this.next_out = 0;

    this.avail_out = 0;

    this.total_out = 0;

    this.msg = "";

    this.state = null;

    this.data_type = 2;

    this.adler = 0;
  }

  var BAD = 30;
  var TYPE = 12;

  function inflate_fast(strm, start) {
    var state;
    var _in;
    var last;
    var _out;
    var beg;
    var end;

    var dmax;

    var wsize;
    var whave;
    var wnext;

    var s_window;
    var hold;
    var bits;
    var lcode;
    var dcode;
    var lmask;
    var dmask;
    var here;
    var op;

    var len;
    var dist;
    var from;
    var from_source;

    var input;
    var output;

    state = strm.state;

    _in = strm.next_in;
    input = strm.input;
    last = _in + (strm.avail_in - 5);
    _out = strm.next_out;
    output = strm.output;
    beg = _out - (start - strm.avail_out);
    end = _out + (strm.avail_out - 257);

    dmax = state.dmax;

    wsize = state.wsize;
    whave = state.whave;
    wnext = state.wnext;
    s_window = state.window;
    hold = state.hold;
    bits = state.bits;
    lcode = state.lencode;
    dcode = state.distcode;
    lmask = (1 << state.lenbits) - 1;
    dmask = (1 << state.distbits) - 1;

    looptop: do {
      if (bits < 15) {
        hold += input[_in++] << bits;
        bits += 8;
        hold += input[_in++] << bits;
        bits += 8;
      }

      here = lcode[hold & lmask];

      dolen: for (;;) {
        op = here >>> 24;
        hold >>>= op;
        bits -= op;
        op = (here >>> 16) & 0xff;
        if (op === 0) {
          output[_out++] = here & 0xffff;
        } else if (op & 16) {
          len = here & 0xffff;
          op &= 15;
          if (op) {
            if (bits < op) {
              hold += input[_in++] << bits;
              bits += 8;
            }
            len += hold & ((1 << op) - 1);
            hold >>>= op;
            bits -= op;
          }

          if (bits < 15) {
            hold += input[_in++] << bits;
            bits += 8;
            hold += input[_in++] << bits;
            bits += 8;
          }
          here = dcode[hold & dmask];

          dodist: for (;;) {
            op = here >>> 24;
            hold >>>= op;
            bits -= op;
            op = (here >>> 16) & 0xff;

            if (op & 16) {
              dist = here & 0xffff;
              op &= 15;
              if (bits < op) {
                hold += input[_in++] << bits;
                bits += 8;
                if (bits < op) {
                  hold += input[_in++] << bits;
                  bits += 8;
                }
              }
              dist += hold & ((1 << op) - 1);

              if (dist > dmax) {
                strm.msg = "invalid distance too far back";
                state.mode = BAD;
                break looptop;
              }

              hold >>>= op;
              bits -= op;

              op = _out - beg;
              if (dist > op) {
                op = dist - op;
                if (op > whave) {
                  if (state.sane) {
                    strm.msg = "invalid distance too far back";
                    state.mode = BAD;
                    break looptop;
                  }
                }
                from = 0;
                from_source = s_window;
                if (wnext === 0) {
                  from += wsize - op;
                  if (op < len) {
                    len -= op;
                    do {
                      output[_out++] = s_window[from++];
                    } while (--op);
                    from = _out - dist;
                    from_source = output;
                  }
                } else if (wnext < op) {
                  from += wsize + wnext - op;
                  op -= wnext;
                  if (op < len) {
                    len -= op;
                    do {
                      output[_out++] = s_window[from++];
                    } while (--op);
                    from = 0;
                    if (wnext < len) {
                      op = wnext;
                      len -= op;
                      do {
                        output[_out++] = s_window[from++];
                      } while (--op);
                      from = _out - dist;
                      from_source = output;
                    }
                  }
                } else {
                  from += wnext - op;
                  if (op < len) {
                    len -= op;
                    do {
                      output[_out++] = s_window[from++];
                    } while (--op);
                    from = _out - dist;
                    from_source = output;
                  }
                }
                while (len > 2) {
                  output[_out++] = from_source[from++];
                  output[_out++] = from_source[from++];
                  output[_out++] = from_source[from++];
                  len -= 3;
                }
                if (len) {
                  output[_out++] = from_source[from++];
                  if (len > 1) {
                    output[_out++] = from_source[from++];
                  }
                }
              } else {
                from = _out - dist;
                do {
                  output[_out++] = output[from++];
                  output[_out++] = output[from++];
                  output[_out++] = output[from++];
                  len -= 3;
                } while (len > 2);
                if (len) {
                  output[_out++] = output[from++];
                  if (len > 1) {
                    output[_out++] = output[from++];
                  }
                }
              }
            } else if ((op & 64) === 0) {
              here = dcode[(here & 0xffff) + (hold & ((1 << op) - 1))];
              continue dodist; // eslint-disable-line no-extra-label
            } else {
              strm.msg = "invalid distance code";
              state.mode = BAD;
              break looptop;
            }

            break;
          }
        } else if ((op & 64) === 0) {
          here = lcode[(here & 0xffff) + (hold & ((1 << op) - 1))];
          continue dolen; // eslint-disable-line no-extra-label
        } else if (op & 32) {
          state.mode = TYPE;
          break looptop;
        } else {
          strm.msg = "invalid literal/length code";
          state.mode = BAD;
          break looptop;
        }

        break;
      }
    } while (_in < last && _out < end);

    len = bits >> 3;
    _in -= len;
    bits -= len << 3;
    hold &= (1 << bits) - 1;

    strm.next_in = _in;
    strm.next_out = _out;
    strm.avail_in = _in < last ? 5 + (last - _in) : 5 - (_in - last);
    strm.avail_out = _out < end ? 257 + (end - _out) : 257 - (_out - end);
    state.hold = hold;
    state.bits = bits;
    return;
  }

  var MAXBITS = 15;
  var ENOUGH_LENS = 852;
  var ENOUGH_DISTS = 592;

  var CODES = 0;
  var LENS = 1;
  var DISTS = 2;

  var lbase = [
    3,
    4,
    5,
    6,
    7,
    8,
    9,
    10,
    11,
    13,
    15,
    17,
    19,
    23,
    27,
    31,
    35,
    43,
    51,
    59,
    67,
    83,
    99,
    115,
    131,
    163,
    195,
    227,
    258,
    0,
    0,
  ];

  var lext = [
    16,
    16,
    16,
    16,
    16,
    16,
    16,
    16,
    17,
    17,
    17,
    17,
    18,
    18,
    18,
    18,
    19,
    19,
    19,
    19,
    20,
    20,
    20,
    20,
    21,
    21,
    21,
    21,
    16,
    72,
    78,
  ];

  var dbase = [
    1,
    2,
    3,
    4,
    5,
    7,
    9,
    13,
    17,
    25,
    33,
    49,
    65,
    97,
    129,
    193,
    257,
    385,
    513,
    769,
    1025,
    1537,
    2049,
    3073,
    4097,
    6145,
    8193,
    12289,
    16385,
    24577,
    0,
    0,
  ];

  var dext = [
    16,
    16,
    16,
    16,
    17,
    17,
    18,
    18,
    19,
    19,
    20,
    20,
    21,
    21,
    22,
    22,
    23,
    23,
    24,
    24,
    25,
    25,
    26,
    26,
    27,
    27,
    28,
    28,
    29,
    29,
    64,
    64,
  ];

  function inflate_table(type, lens, lens_index, codes, table, table_index, work, opts) {
    var bits = opts.bits;

    var len = 0;
    var sym = 0;
    var min = 0;
    var max = 0;
    var root = 0;
    var curr = 0;
    var drop = 0;
    var left = 0;
    var used = 0;
    var huff = 0;
    var incr;
    var fill;
    var low;
    var mask;
    var next;
    var base = null;
    var base_index = 0;

    var end;
    var count = new Buf16(MAXBITS + 1);
    var offs = new Buf16(MAXBITS + 1);
    var extra = null;
    var extra_index = 0;

    var here_bits;
    var here_op;
    var here_val;

    for (len = 0; len <= MAXBITS; len++) {
      count[len] = 0;
    }
    for (sym = 0; sym < codes; sym++) {
      count[lens[lens_index + sym]]++;
    }

    root = bits;
    for (max = MAXBITS; max >= 1; max--) {
      if (count[max] !== 0) {
        break;
      }
    }
    if (root > max) {
      root = max;
    }
    if (max === 0) {
      table[table_index++] = (1 << 24) | (64 << 16) | 0;

      table[table_index++] = (1 << 24) | (64 << 16) | 0;

      opts.bits = 1;
      return 0;
    }
    for (min = 1; min < max; min++) {
      if (count[min] !== 0) {
        break;
      }
    }
    if (root < min) {
      root = min;
    }

    left = 1;
    for (len = 1; len <= MAXBITS; len++) {
      left <<= 1;
      left -= count[len];
      if (left < 0) {
        return -1;
      }
    }
    if (left > 0 && (type === CODES || max !== 1)) {
      return -1;
    }

    offs[1] = 0;
    for (len = 1; len < MAXBITS; len++) {
      offs[len + 1] = offs[len] + count[len];
    }

    for (sym = 0; sym < codes; sym++) {
      if (lens[lens_index + sym] !== 0) {
        work[offs[lens[lens_index + sym]]++] = sym;
      }
    }

    if (type === CODES) {
      base = extra = work;
      end = 19;
    } else if (type === LENS) {
      base = lbase;
      base_index -= 257;
      extra = lext;
      extra_index -= 257;
      end = 256;
    } else {
      base = dbase;
      extra = dext;
      end = -1;
    }

    huff = 0;
    sym = 0;
    len = min;
    next = table_index;
    curr = root;
    drop = 0;
    low = -1;
    used = 1 << root;
    mask = used - 1;

    if ((type === LENS && used > ENOUGH_LENS) || (type === DISTS && used > ENOUGH_DISTS)) {
      return 1;
    }

    for (;;) {
      here_bits = len - drop;
      if (work[sym] < end) {
        here_op = 0;
        here_val = work[sym];
      } else if (work[sym] > end) {
        here_op = extra[extra_index + work[sym]];
        here_val = base[base_index + work[sym]];
      } else {
        here_op = 32 + 64;
        here_val = 0;
      }

      incr = 1 << (len - drop);
      fill = 1 << curr;
      min = fill;
      do {
        fill -= incr;
        table[next + (huff >> drop) + fill] = (here_bits << 24) | (here_op << 16) | here_val | 0;
      } while (fill !== 0);

      incr = 1 << (len - 1);
      while (huff & incr) {
        incr >>= 1;
      }
      if (incr !== 0) {
        huff &= incr - 1;
        huff += incr;
      } else {
        huff = 0;
      }

      sym++;
      if (--count[len] === 0) {
        if (len === max) {
          break;
        }
        len = lens[lens_index + work[sym]];
      }

      if (len > root && (huff & mask) !== low) {
        if (drop === 0) {
          drop = root;
        }

        next += min;

        curr = len - drop;
        left = 1 << curr;
        while (curr + drop < max) {
          left -= count[curr + drop];
          if (left <= 0) {
            break;
          }
          curr++;
          left <<= 1;
        }

        used += 1 << curr;
        if ((type === LENS && used > ENOUGH_LENS) || (type === DISTS && used > ENOUGH_DISTS)) {
          return 1;
        }

        low = huff & mask;

        table[low] = (root << 24) | (curr << 16) | (next - table_index) | 0;
      }
    }

    if (huff !== 0) {
      table[next + huff] = ((len - drop) << 24) | (64 << 16) | 0;
    }

    opts.bits = root;
    return 0;
  }

  var CODES$1 = 0;
  var LENS$1 = 1;
  var DISTS$1 = 2;

  var Z_FINISH$1 = 4;
  var Z_BLOCK$1 = 5;
  var Z_TREES = 6;

  var Z_OK$1 = 0;
  var Z_STREAM_END$1 = 1;

  var Z_STREAM_ERROR$1 = -2;
  var Z_DATA_ERROR$1 = -3;
  var Z_MEM_ERROR = -4;
  var Z_BUF_ERROR$1 = -5;

  var HEAD = 1;
  var FLAGS = 2;
  var TIME = 3;
  var OS = 4;
  var EXLEN = 5;
  var EXTRA = 6;
  var NAME = 7;
  var COMMENT = 8;
  var HCRC = 9;
  var DICTID = 10;
  var DICT = 11;
  var TYPE$1 = 12;
  var TYPEDO = 13;
  var STORED = 14;
  var COPY_ = 15;
  var COPY = 16;
  var TABLE = 17;
  var LENLENS = 18;
  var CODELENS = 19;
  var LEN_ = 20;
  var LEN = 21;
  var LENEXT = 22;
  var DIST = 23;
  var DISTEXT = 24;
  var MATCH = 25;
  var LIT = 26;
  var CHECK = 27;
  var LENGTH = 28;
  var DONE = 29;
  var BAD$1 = 30;
  var MEM = 31;
  var SYNC = 32;

  var ENOUGH_LENS$1 = 852;
  var ENOUGH_DISTS$1 = 592;

  function InflateState() {
    this.mode = 0;
    this.last = false;
    this.wrap = 0;
    this.havedict = false;
    this.flags = 0;
    this.dmax = 0;
    this.check = 0;
    this.total = 0;

    this.head = null;

    this.wbits = 0;
    this.wsize = 0;
    this.whave = 0;
    this.wnext = 0;
    this.window = null;

    this.hold = 0;
    this.bits = 0;

    this.length = 0;
    this.offset = 0;

    this.extra = 0;

    this.lencode = null;
    this.distcode = null;
    this.lenbits = 0;
    this.distbits = 0;

    this.ncode = 0;
    this.nlen = 0;
    this.ndist = 0;
    this.have = 0;
    this.next = null;

    this.lens = new Buf16(320);
    this.work = new Buf16(288);

    this.lendyn = null;
    this.distdyn = null;
    this.sane = 0;
    this.back = 0;
    this.was = 0;
  }

  function inflateResetKeep(strm) {
    var state;

    if (!strm || !strm.state) {
      return Z_STREAM_ERROR$1;
    }
    state = strm.state;
    strm.total_in = strm.total_out = state.total = 0;
    strm.msg = "";
    if (state.wrap) {
      strm.adler = state.wrap & 1;
    }
    state.mode = HEAD;
    state.last = 0;
    state.havedict = 0;
    state.dmax = 32768;
    state.head = null;
    state.hold = 0;
    state.bits = 0;

    state.lencode = state.lendyn = new Buf32(ENOUGH_LENS$1);
    state.distcode = state.distdyn = new Buf32(ENOUGH_DISTS$1);

    state.sane = 1;
    state.back = -1;

    return Z_OK$1;
  }

  function inflateReset(strm) {
    var state;

    if (!strm || !strm.state) {
      return Z_STREAM_ERROR$1;
    }
    state = strm.state;
    state.wsize = 0;
    state.whave = 0;
    state.wnext = 0;
    return inflateResetKeep(strm);
  }

  function inflateReset2(strm, windowBits) {
    var wrap;
    var state;

    if (!strm || !strm.state) {
      return Z_STREAM_ERROR$1;
    }
    state = strm.state;

    if (windowBits < 0) {
      wrap = 0;
      windowBits = -windowBits;
    } else {
      wrap = (windowBits >> 4) + 1;
      if (windowBits < 48) {
        windowBits &= 15;
      }
    }

    if (windowBits && (windowBits < 8 || windowBits > 15)) {
      return Z_STREAM_ERROR$1;
    }
    if (state.window !== null && state.wbits !== windowBits) {
      state.window = null;
    }

    state.wrap = wrap;
    state.wbits = windowBits;
    return inflateReset(strm);
  }

  function inflateInit2(strm, windowBits) {
    var ret;
    var state;

    if (!strm) {
      return Z_STREAM_ERROR$1;
    }

    state = new InflateState();

    strm.state = state;
    state.window = null;
    ret = inflateReset2(strm, windowBits);
    if (ret !== Z_OK$1) {
      strm.state = null;
    }
    return ret;
  }

  var virgin = true;

  var lenfix;
  var distfix;

  function fixedtables(state) {
    if (virgin) {
      var sym;

      lenfix = new Buf32(512);
      distfix = new Buf32(32);

      sym = 0;
      while (sym < 144) {
        state.lens[sym++] = 8;
      }
      while (sym < 256) {
        state.lens[sym++] = 9;
      }
      while (sym < 280) {
        state.lens[sym++] = 7;
      }
      while (sym < 288) {
        state.lens[sym++] = 8;
      }

      inflate_table(LENS$1, state.lens, 0, 288, lenfix, 0, state.work, { bits: 9 });

      sym = 0;
      while (sym < 32) {
        state.lens[sym++] = 5;
      }

      inflate_table(DISTS$1, state.lens, 0, 32, distfix, 0, state.work, { bits: 5 });

      virgin = false;
    }

    state.lencode = lenfix;
    state.lenbits = 9;
    state.distcode = distfix;
    state.distbits = 5;
  }

  function updatewindow(strm, src, end, copy) {
    var dist;
    var state = strm.state;

    if (state.window === null) {
      state.wsize = 1 << state.wbits;
      state.wnext = 0;
      state.whave = 0;

      state.window = new Buf8(state.wsize);
    }

    if (copy >= state.wsize) {
      arraySet(state.window, src, end - state.wsize, state.wsize, 0);
      state.wnext = 0;
      state.whave = state.wsize;
    } else {
      dist = state.wsize - state.wnext;
      if (dist > copy) {
        dist = copy;
      }

      arraySet(state.window, src, end - copy, dist, state.wnext);
      copy -= dist;
      if (copy) {
        arraySet(state.window, src, end - copy, copy, 0);
        state.wnext = copy;
        state.whave = state.wsize;
      } else {
        state.wnext += dist;
        if (state.wnext === state.wsize) {
          state.wnext = 0;
        }
        if (state.whave < state.wsize) {
          state.whave += dist;
        }
      }
    }
    return 0;
  }

  function inflate(strm, flush) {
    var state;
    var input;
    var output;
    var next;
    var put;
    var have;
    var left;
    var hold;
    var bits;
    var _in;
    var _out;
    var copy;
    var from;
    var from_source;
    var here = 0;
    var here_bits;
    var here_op;
    var here_val;
    var last_bits;
    var last_op;
    var last_val;
    var len;
    var ret;
    var opts;

    var n;

    var order = [16, 17, 18, 0, 8, 7, 9, 6, 10, 5, 11, 4, 12, 3, 13, 2, 14, 1, 15];

    if (!strm || !strm.state || !strm.output || (!strm.input && strm.avail_in !== 0)) {
      return Z_STREAM_ERROR$1;
    }

    state = strm.state;
    if (state.mode === TYPE$1) {
      state.mode = TYPEDO;
    }

    put = strm.next_out;
    output = strm.output;
    left = strm.avail_out;
    next = strm.next_in;
    input = strm.input;
    have = strm.avail_in;
    hold = state.hold;
    bits = state.bits;

    _in = have;
    _out = left;
    ret = Z_OK$1;

    inf_leave: for (;;) {
      switch (state.mode) {
        case HEAD:
          if (state.wrap === 0) {
            state.mode = TYPEDO;
            break;
          }
          /* pragma:DEBUG_START */
          throw new Error("gzip stupport removed");
        /* pragma:DEBUG_END */

        case FLAGS:
          /* pragma:DEBUG_START */
          throw new Error("gzip stupport removed");
        /* pragma:DEBUG_END */
        /* falls through */
        case TIME:
          /* pragma:DEBUG_START */
          throw new Error("gzip stupport removed");
        /* pragma:DEBUG_END */
        /* falls through */
        case OS:
          /* pragma:DEBUG_START */
          throw new Error("gzip stupport removed");
        /* pragma:DEBUG_END */
        /* falls through */
        case EXLEN:
          /* pragma:DEBUG_START */
          throw new Error("gzip stupport removed");
        /* pragma:DEBUG_END */
        /* falls through */
        case EXTRA:
          /* pragma:DEBUG_START */
          throw new Error("gzip stupport removed");
        /* pragma:DEBUG_END */
        /* falls through */
        case NAME:
          /* pragma:DEBUG_START */
          throw new Error("gzip stupport removed");
        /* pragma:DEBUG_END */
        /* falls through */
        case COMMENT:
          /* pragma:DEBUG_START */
          throw new Error("gzip stupport removed");
        /* pragma:DEBUG_END */
        /* falls through */
        case HCRC:
          /* pragma:DEBUG_START */
          throw new Error("gzip stupport removed");
        /* pragma:DEBUG_END */
        case DICTID:
          /* pragma:DEBUG_START */
          throw new Error("gzip stupport removed");
        /* pragma:DEBUG_END */
        /* falls through */
        case DICT:
          /* pragma:DEBUG_START */
          throw new Error("gzip stupport removed");
        /* pragma:DEBUG_END */
        /* falls through */
        case TYPE$1:
          if (flush === Z_BLOCK$1 || flush === Z_TREES) {
            break inf_leave;
          }
        /* falls through */
        case TYPEDO:
          if (state.last) {
            hold >>>= bits & 7;
            bits -= bits & 7;

            state.mode = CHECK;
            break;
          }

          while (bits < 3) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }

          state.last = hold & 0x01;

          hold >>>= 1;
          bits -= 1;

          switch (hold & 0x03) {
            default:
              // impossible
              break;
            case 0:
              state.mode = STORED;
              break;
            case 1:
              fixedtables(state);

              state.mode = LEN_;
              if (flush === Z_TREES) {
                hold >>>= 2;
                bits -= 2;

                break inf_leave;
              }
              break;
            case 2:
              state.mode = TABLE;
              break;
            case 3:
              strm.msg = "invalid block type";
              state.mode = BAD$1;
          }

          hold >>>= 2;
          bits -= 2;

          break;
        case STORED:
          /* pragma:DEBUG_START */
          throw new Error("stored stupport removed");
        /* pragma:DEBUG_END */
        /* falls through */
        case COPY_:
          /* pragma:DEBUG_START */
          throw new Error("copy stupport removed");
        /* pragma:DEBUG_END */
        /* falls through */
        case COPY:
          /* pragma:DEBUG_START */
          throw new Error("copy stupport removed");
        /* pragma:DEBUG_END */
        case TABLE:
          while (bits < 14) {
            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }

          state.nlen = (hold & 0x1f) + 257;

          hold >>>= 5;
          bits -= 5;

          state.ndist = (hold & 0x1f) + 1;

          hold >>>= 5;
          bits -= 5;

          state.ncode = (hold & 0x0f) + 4;

          hold >>>= 4;
          bits -= 4;

          if (state.nlen > 286 || state.ndist > 30) {
            strm.msg = "too many length or distance symbols";
            state.mode = BAD$1;
            break;
          }

          state.have = 0;
          state.mode = LENLENS;
        /* falls through */
        case LENLENS:
          while (state.have < state.ncode) {
            while (bits < 3) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }

            state.lens[order[state.have++]] = hold & 0x07;

            hold >>>= 3;
            bits -= 3;
          }
          while (state.have < 19) {
            state.lens[order[state.have++]] = 0;
          }

          state.lencode = state.lendyn;
          state.lenbits = 7;

          opts = { bits: state.lenbits };
          ret = inflate_table(CODES$1, state.lens, 0, 19, state.lencode, 0, state.work, opts);
          state.lenbits = opts.bits;

          if (ret) {
            strm.msg = "invalid code lengths set";
            state.mode = BAD$1;
            break;
          }

          state.have = 0;
          state.mode = CODELENS;
        /* falls through */
        case CODELENS:
          while (state.have < state.nlen + state.ndist) {
            for (;;) {
              here = state.lencode[hold & ((1 << state.lenbits) - 1)];
              here_bits = here >>> 24;
              here_op = (here >>> 16) & 0xff;
              here_val = here & 0xffff;

              if (here_bits <= bits) {
                break;
              }

              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }
            if (here_val < 16) {
              hold >>>= here_bits;
              bits -= here_bits;

              state.lens[state.have++] = here_val;
            } else {
              if (here_val === 16) {
                n = here_bits + 2;
                while (bits < n) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }

                hold >>>= here_bits;
                bits -= here_bits;

                if (state.have === 0) {
                  strm.msg = "invalid bit length repeat";
                  state.mode = BAD$1;
                  break;
                }
                len = state.lens[state.have - 1];
                copy = 3 + (hold & 0x03);

                hold >>>= 2;
                bits -= 2;
              } else if (here_val === 17) {
                n = here_bits + 3;
                while (bits < n) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }

                hold >>>= here_bits;
                bits -= here_bits;

                len = 0;
                copy = 3 + (hold & 0x07);

                hold >>>= 3;
                bits -= 3;
              } else {
                n = here_bits + 7;
                while (bits < n) {
                  if (have === 0) {
                    break inf_leave;
                  }
                  have--;
                  hold += input[next++] << bits;
                  bits += 8;
                }

                hold >>>= here_bits;
                bits -= here_bits;

                len = 0;
                copy = 11 + (hold & 0x7f);

                hold >>>= 7;
                bits -= 7;
              }
              if (state.have + copy > state.nlen + state.ndist) {
                strm.msg = "invalid bit length repeat";
                state.mode = BAD$1;
                break;
              }
              while (copy--) {
                state.lens[state.have++] = len;
              }
            }
          }

          if (state.mode === BAD$1) {
            break;
          }

          if (state.lens[256] === 0) {
            strm.msg = "invalid code -- missing end-of-block";
            state.mode = BAD$1;
            break;
          }

          state.lenbits = 9;

          opts = { bits: state.lenbits };
          ret = inflate_table(
            LENS$1,
            state.lens,
            0,
            state.nlen,
            state.lencode,
            0,
            state.work,
            opts
          );

          state.lenbits = opts.bits;

          if (ret) {
            strm.msg = "invalid literal/lengths set";
            state.mode = BAD$1;
            break;
          }

          state.distbits = 6;

          state.distcode = state.distdyn;
          opts = { bits: state.distbits };
          ret = inflate_table(
            DISTS$1,
            state.lens,
            state.nlen,
            state.ndist,
            state.distcode,
            0,
            state.work,
            opts
          );

          state.distbits = opts.bits;

          if (ret) {
            strm.msg = "invalid distances set";
            state.mode = BAD$1;
            break;
          }

          state.mode = LEN_;
          if (flush === Z_TREES) {
            break inf_leave;
          }
        /* falls through */
        case LEN_:
          state.mode = LEN;
        /* falls through */
        case LEN:
          if (have >= 6 && left >= 258) {
            strm.next_out = put;
            strm.avail_out = left;
            strm.next_in = next;
            strm.avail_in = have;
            state.hold = hold;
            state.bits = bits;

            inflate_fast(strm, _out);

            put = strm.next_out;
            output = strm.output;
            left = strm.avail_out;
            next = strm.next_in;
            input = strm.input;
            have = strm.avail_in;
            hold = state.hold;
            bits = state.bits;

            if (state.mode === TYPE$1) {
              state.back = -1;
            }
            break;
          }
          state.back = 0;
          for (;;) {
            here = state.lencode[hold & ((1 << state.lenbits) - 1)];
            here_bits = here >>> 24;
            here_op = (here >>> 16) & 0xff;
            here_val = here & 0xffff;

            if (here_bits <= bits) {
              break;
            }

            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          if (here_op && (here_op & 0xf0) === 0) {
            last_bits = here_bits;
            last_op = here_op;
            last_val = here_val;
            for (;;) {
              here =
                state.lencode[
                  last_val + ((hold & ((1 << (last_bits + last_op)) - 1)) >> last_bits)
                ];
              here_bits = here >>> 24;
              here_op = (here >>> 16) & 0xff;
              here_val = here & 0xffff;

              if (last_bits + here_bits <= bits) {
                break;
              }

              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }

            hold >>>= last_bits;
            bits -= last_bits;

            state.back += last_bits;
          }

          hold >>>= here_bits;
          bits -= here_bits;

          state.back += here_bits;
          state.length = here_val;
          if (here_op === 0) {
            state.mode = LIT;
            break;
          }
          if (here_op & 32) {
            state.back = -1;
            state.mode = TYPE$1;
            break;
          }
          if (here_op & 64) {
            strm.msg = "invalid literal/length code";
            state.mode = BAD$1;
            break;
          }
          state.extra = here_op & 15;
          state.mode = LENEXT;
        /* falls through */
        case LENEXT:
          if (state.extra) {
            n = state.extra;
            while (bits < n) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }

            state.length += hold & ((1 << state.extra) - 1);

            hold >>>= state.extra;
            bits -= state.extra;

            state.back += state.extra;
          }

          state.was = state.length;
          state.mode = DIST;
        /* falls through */
        case DIST:
          for (;;) {
            here = state.distcode[hold & ((1 << state.distbits) - 1)];
            here_bits = here >>> 24;
            here_op = (here >>> 16) & 0xff;
            here_val = here & 0xffff;

            if (here_bits <= bits) {
              break;
            }

            if (have === 0) {
              break inf_leave;
            }
            have--;
            hold += input[next++] << bits;
            bits += 8;
          }
          if ((here_op & 0xf0) === 0) {
            last_bits = here_bits;
            last_op = here_op;
            last_val = here_val;
            for (;;) {
              here =
                state.distcode[
                  last_val + ((hold & ((1 << (last_bits + last_op)) - 1)) >> last_bits)
                ];
              here_bits = here >>> 24;
              here_op = (here >>> 16) & 0xff;
              here_val = here & 0xffff;

              if (last_bits + here_bits <= bits) {
                break;
              }

              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }

            hold >>>= last_bits;
            bits -= last_bits;

            state.back += last_bits;
          }

          hold >>>= here_bits;
          bits -= here_bits;

          state.back += here_bits;
          if (here_op & 64) {
            strm.msg = "invalid distance code";
            state.mode = BAD$1;
            break;
          }
          state.offset = here_val;
          state.extra = here_op & 15;
          state.mode = DISTEXT;
        /* falls through */
        case DISTEXT:
          if (state.extra) {
            n = state.extra;
            while (bits < n) {
              if (have === 0) {
                break inf_leave;
              }
              have--;
              hold += input[next++] << bits;
              bits += 8;
            }

            state.offset += hold & ((1 << state.extra) - 1);

            hold >>>= state.extra;
            bits -= state.extra;

            state.back += state.extra;
          }

          if (state.offset > state.dmax) {
            strm.msg = "invalid distance too far back";
            state.mode = BAD$1;
            break;
          }

          state.mode = MATCH;
        /* falls through */
        case MATCH:
          if (left === 0) {
            break inf_leave;
          }
          copy = _out - left;
          if (state.offset > copy) {
            copy = state.offset - copy;
            if (copy > state.whave) {
              if (state.sane) {
                strm.msg = "invalid distance too far back";
                state.mode = BAD$1;
                break;
              }
            }
            if (copy > state.wnext) {
              copy -= state.wnext;
              from = state.wsize - copy;
            } else {
              from = state.wnext - copy;
            }
            if (copy > state.length) {
              copy = state.length;
            }
            from_source = state.window;
          } else {
            from_source = output;
            from = put - state.offset;
            copy = state.length;
          }
          if (copy > left) {
            copy = left;
          }
          left -= copy;
          state.length -= copy;
          do {
            output[put++] = from_source[from++];
          } while (--copy);
          if (state.length === 0) {
            state.mode = LEN;
          }
          break;
        case LIT:
          if (left === 0) {
            break inf_leave;
          }
          output[put++] = state.length;
          left--;
          state.mode = LEN;
          break;
        case CHECK:
          if (state.wrap) {
            /* pragma:DEBUG_START */
            throw new Error("gzip stupport removed");
            /* pragma:DEBUG_END */
          }
          state.mode = LENGTH;
        /* falls through */
        case LENGTH:
          if (state.wrap && state.flags) {
            /* pragma:DEBUG_START */
            throw new Error("gzip stupport removed");
            /* pragma:DEBUG_END */
          }
          state.mode = DONE;
        /* falls through */
        case DONE:
          ret = Z_STREAM_END$1;
          break inf_leave;
        case BAD$1:
          ret = Z_DATA_ERROR$1;
          break inf_leave;
        case MEM:
          return Z_MEM_ERROR;
        case SYNC:
        /* falls through */
        default:
          return Z_STREAM_ERROR$1;
      }
    }

    strm.next_out = put;
    strm.avail_out = left;
    strm.next_in = next;
    strm.avail_in = have;
    state.hold = hold;
    state.bits = bits;

    if (
      state.wsize ||
      (_out !== strm.avail_out &&
        state.mode < BAD$1 &&
        (state.mode < CHECK || flush !== Z_FINISH$1))
    ) {
      if (updatewindow(strm, strm.output, strm.next_out, _out - strm.avail_out)) {
        state.mode = MEM;
        return Z_MEM_ERROR;
      }
    }
    _in -= strm.avail_in;
    _out -= strm.avail_out;
    strm.total_in += _in;
    strm.total_out += _out;
    state.total += _out;
    if (state.wrap && _out) {
      /* pragma:DEBUG_START */
      throw new Error("gzip stupport removed");
      /* pragma:DEBUG_END */
    }
    strm.data_type =
      state.bits +
      (state.last ? 64 : 0) +
      (state.mode === TYPE$1 ? 128 : 0) +
      (state.mode === LEN_ || state.mode === COPY_ ? 256 : 0);
    if (((_in === 0 && _out === 0) || flush === Z_FINISH$1) && ret === Z_OK$1) {
      ret = Z_BUF_ERROR$1;
    }
    return ret;
  }

  function inflateEnd(strm) {
    if (!strm || !strm.state) {
      return Z_STREAM_ERROR$1;
    }

    var state = strm.state;
    if (state.window) {
      state.window = null;
    }
    strm.state = null;
    return Z_OK$1;
  }

  function inflateGetHeader(strm, head) {
    var state;

    if (!strm || !strm.state) {
      return Z_STREAM_ERROR$1;
    }
    state = strm.state;
    if ((state.wrap & 2) === 0) {
      return Z_STREAM_ERROR$1;
    }

    state.head = head;
    head.done = false;
    return Z_OK$1;
  }

  var c = {
    Z_NO_FLUSH: 0,
    Z_PARTIAL_FLUSH: 1,
    Z_SYNC_FLUSH: 2,
    Z_FULL_FLUSH: 3,
    Z_FINISH: 4,
    Z_BLOCK: 5,
    Z_TREES: 6,

    Z_OK: 0,
    Z_STREAM_END: 1,
    Z_NEED_DICT: 2,
    Z_ERRNO: -1,
    Z_STREAM_ERROR: -2,
    Z_DATA_ERROR: -3,

    Z_BUF_ERROR: -5,

    Z_NO_COMPRESSION: 0,
    Z_BEST_SPEED: 1,
    Z_BEST_COMPRESSION: 9,
    Z_DEFAULT_COMPRESSION: -1,

    Z_FILTERED: 1,
    Z_HUFFMAN_ONLY: 2,
    Z_RLE: 3,
    Z_FIXED: 4,
    Z_DEFAULT_STRATEGY: 0,

    Z_BINARY: 0,
    Z_TEXT: 1,

    Z_UNKNOWN: 2,

    Z_DEFLATED: 8,
  };

  function GZheader() {
    this.text = 0;

    this.time = 0;

    this.xflags = 0;

    this.os = 0;

    this.extra = null;

    this.extra_len = 0;

    this.name = "";

    this.comment = "";

    this.hcrc = 0;

    this.done = false;
  }

  var toString = Object.prototype.toString;

  var Z_NO_FLUSH$1 = 0;
  var Z_FINISH$2 = 4;

  var Z_OK$2 = 0;
  var Z_STREAM_END$2 = 1;
  var Z_SYNC_FLUSH = 2;

  var Z_DEFAULT_COMPRESSION$1 = -1;

  var Z_DEFAULT_STRATEGY$1 = 0;

  var Z_DEFLATED$2 = 8;

  class Deflate {
    constructor(options) {
      if (!(this instanceof Deflate)) return new Deflate(options);

      this.options = assign(
        {
          level: Z_DEFAULT_COMPRESSION$1,
          method: Z_DEFLATED$2,
          chunkSize: 16384,
          windowBits: 15,
          memLevel: 8,
          strategy: Z_DEFAULT_STRATEGY$1,
          to: "",
        },
        options || {}
      );

      var opt = this.options;

      if (opt.raw && opt.windowBits > 0) {
        opt.windowBits = -opt.windowBits;
      } else if (opt.gzip && opt.windowBits > 0 && opt.windowBits < 16) {
        opt.windowBits += 16;
      }

      this.err = 0;
      this.msg = "";
      this.ended = false;
      this.chunks = [];

      this.strm = new ZStream();
      this.strm.avail_out = 0;

      var status = deflateInit2(
        this.strm,
        opt.level,
        opt.method,
        opt.windowBits,
        opt.memLevel,
        opt.strategy
      );

      if (status !== Z_OK$2) {
        throw new Error(msg[status]);
      }
    }

    push(data, mode) {
      var strm = this.strm;
      var chunkSize = this.options.chunkSize;
      var status;
      var _mode;

      if (this.ended) {
        return false;
      }

      _mode = mode === ~~mode ? mode : mode === true ? Z_FINISH$2 : Z_NO_FLUSH$1;

      if (typeof data === "string") {
        /* pragma:DEBUG_START */
        throw new Error("str stupport removed");
        /* pragma:DEBUG_END */
      } else if (toString.call(data) === "[object ArrayBuffer]") {
        strm.input = new Uint8Array(data);
      } else {
        strm.input = data;
      }

      strm.next_in = 0;
      strm.avail_in = strm.input.length;

      do {
        if (strm.avail_out === 0) {
          strm.output = new Buf8(chunkSize);
          strm.next_out = 0;
          strm.avail_out = chunkSize;
        }
        status = deflate(strm, _mode);

        if (status !== Z_STREAM_END$2 && status !== Z_OK$2) {
          this.onEnd(status);
          this.ended = true;
          return false;
        }
        if (
          strm.avail_out === 0 ||
          (strm.avail_in === 0 && (_mode === Z_FINISH$2 || _mode === Z_SYNC_FLUSH))
        ) {
          if (this.options.to === "string") {
            this.onData(buf2binstring(shrinkBuf(strm.output, strm.next_out)));
          } else {
            this.onData(shrinkBuf(strm.output, strm.next_out));
          }
        }
      } while ((strm.avail_in > 0 || strm.avail_out === 0) && status !== Z_STREAM_END$2);

      if (_mode === Z_FINISH$2) {
        status = deflateEnd(this.strm);
        this.onEnd(status);
        this.ended = true;
        return status === Z_OK$2;
      }

      if (_mode === Z_SYNC_FLUSH) {
        this.onEnd(Z_OK$2);
        strm.avail_out = 0;
        return true;
      }

      return true;
    }

    onData(chunk) {
      this.chunks.push(chunk);
    }

    onEnd(status) {
      if (status === Z_OK$2) {
        if (this.options.to === "string") {
          this.result = this.chunks.join("");
        } else {
          this.result = flattenChunks(this.chunks);
        }
      }
      this.chunks = [];
      this.err = status;
      this.msg = this.strm.msg;
    }
  }

  function zlibDeflate(input, options) {
    var deflator = new Deflate(options);

    deflator.push(input, true);

    if (deflator.err) {
      throw deflator.msg || msg[deflator.err];
    }

    return deflator.result;
  }

  class Inflate {
    constructor(options) {
      if (!(this instanceof Inflate)) return new Inflate(options);

      this.options = assign(
        {
          chunkSize: 16384,
          windowBits: 0,
          to: "",
        },
        options || {}
      );

      var opt = this.options;

      if (opt.raw && opt.windowBits >= 0 && opt.windowBits < 16) {
        opt.windowBits = -opt.windowBits;
        if (opt.windowBits === 0) {
          opt.windowBits = -15;
        }
      }

      if (opt.windowBits >= 0 && opt.windowBits < 16 && !(options && options.windowBits)) {
        opt.windowBits += 32;
      }

      if (opt.windowBits > 15 && opt.windowBits < 48) {
        if ((opt.windowBits & 15) === 0) {
          opt.windowBits |= 15;
        }
      }

      this.err = 0;
      this.msg = "";
      this.ended = false;
      this.chunks = [];

      this.strm = new ZStream();
      this.strm.avail_out = 0;

      var status = inflateInit2(this.strm, opt.windowBits);

      if (status !== c.Z_OK) {
        throw new Error(msg[status]);
      }

      this.header = new GZheader();

      inflateGetHeader(this.strm, this.header);
    }

    push(data, mode) {
      var strm = this.strm;
      var chunkSize = this.options.chunkSize;
      var status;
      var _mode;

      var allowBufError = false;

      if (this.ended) {
        return false;
      }
      _mode = mode === ~~mode ? mode : mode === true ? c.Z_FINISH : c.Z_NO_FLUSH;

      if (typeof data === "string") {
        strm.input = binstring2buf(data);
      } else if (toString.call(data) === "[object ArrayBuffer]") {
        strm.input = new Uint8Array(data);
      } else {
        strm.input = data;
      }

      strm.next_in = 0;
      strm.avail_in = strm.input.length;

      do {
        if (strm.avail_out === 0) {
          strm.output = new Buf8(chunkSize);
          strm.next_out = 0;
          strm.avail_out = chunkSize;
        }

        status = inflate(strm, c.Z_NO_FLUSH);

        if (status === c.Z_BUF_ERROR && allowBufError === true) {
          status = c.Z_OK;
          allowBufError = false;
        }

        if (status !== c.Z_STREAM_END && status !== c.Z_OK) {
          this.onEnd(status);
          this.ended = true;
          return false;
        }

        if (strm.next_out) {
          if (
            strm.avail_out === 0 ||
            status === c.Z_STREAM_END ||
            (strm.avail_in === 0 && (_mode === c.Z_FINISH || _mode === c.Z_SYNC_FLUSH))
          ) {
            if (this.options.to === "string") {
              /* pragma:DEBUG_START */
              throw new Error("str stupport removed");
              /* pragma:DEBUG_END */
            } else {
              this.onData(shrinkBuf(strm.output, strm.next_out));
            }
          }
        }

        if (strm.avail_in === 0 && strm.avail_out === 0) {
          allowBufError = true;
        }
      } while ((strm.avail_in > 0 || strm.avail_out === 0) && status !== c.Z_STREAM_END);

      if (status === c.Z_STREAM_END) {
        _mode = c.Z_FINISH;
      }

      if (_mode === c.Z_FINISH) {
        status = inflateEnd(this.strm);
        this.onEnd(status);
        this.ended = true;
        return status === c.Z_OK;
      }

      if (_mode === c.Z_SYNC_FLUSH) {
        this.onEnd(c.Z_OK);
        strm.avail_out = 0;
        return true;
      }

      return true;
    }

    onData(chunk) {
      this.chunks.push(chunk);
    }

    onEnd(status) {
      if (status === c.Z_OK) {
        if (this.options.to === "string") {
          this.result = this.chunks.join("");
        } else {
          this.result = flattenChunks(this.chunks);
        }
      }
      this.chunks = [];
      this.err = status;
      this.msg = this.strm.msg;
    }
  }

  function zlibInflate(input, options) {
    var inflator = new Inflate(options);

    inflator.push(input, true);

    if (inflator.err) {
      throw inflator.msg || msg[inflator.err];
    }

    return inflator.result;
  }

  return {
    zlibDeflate,
    zlibInflate,
  };
})();

export { Zlib };
