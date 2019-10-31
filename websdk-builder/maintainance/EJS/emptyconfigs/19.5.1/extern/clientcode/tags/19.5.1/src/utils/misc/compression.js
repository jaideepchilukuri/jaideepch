/**
 * Provides interfaces to compression code (Zlib primarily)
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.Utils.Misc.Compression");

fs.require("fs.Top");
fs.require("fs.Utils.Misc.Zlib");

(function (utils) {

  /**
   * A compression module (GZIP DEFLATE/INFLATE)
   * @type {{byteArrayToString: byteArrayToString, stringToByteArray: stringToByteArray, _utf8_encode: _utf8_encode, compress: compress, fragmentAndCompress: fragmentAndCompress, decompress: decompress}}
   */
  var Compress = {
    /**
     * Translate a byte array to a string
     * @param byte_array
     * @returns {string}
     */
    byteArrayToString: function (byte_array) {
      var ret = "";
      for (var i = 0; i < byte_array.length; i++) {
        ret += String.fromCharCode(byte_array[i]);
      }
      return ret;
    },

    /**
     * Translate a string to a byte array
     * @param string
     * @returns {Array}
     */
    stringToByteArray: function (string) {
      var byte_array = [];
      for (var i = 0; i < string.length; i++) {
        byte_array[byte_array.length] = string.charCodeAt(i);
      }
      return byte_array;
    },

    /**
     * Convert to utf8
     * @param string
     * @returns {string}
     * @private
     */
    _utf8_encode: function (string) {
      var utftext = "";

      for (var n = 0; n < string.length; n++) {
        var c = string.charCodeAt(n);
        if (c < 128) {
          utftext += String.fromCharCode(c);
        }
        else if ((c > 127) && (c < 2048)) {
          utftext += String.fromCharCode((c >> 6) | 192);
          utftext += String.fromCharCode((c & 63) | 128);
        }
        else {
          utftext += String.fromCharCode((c >> 12) | 224);
          utftext += String.fromCharCode(((c >> 6) & 63) | 128);
          utftext += String.fromCharCode((c & 63) | 128);
        }
      }

      return utftext;
    },

    /**
     * Compress it
     * @param data
     * @param encodingFn  ex: fs.enc, Compress._utf8_encode (default)
     */
    compress: function (data, encodingFn) {
      if (!fs.isFunction(encodingFn)) {
        encodingFn = Compress._utf8_encode;
      }
      var input_data_base64_encoded = encodingFn(data);

      // Translate it to a byte array
      var input_byte_array = Compress.stringToByteArray(input_data_base64_encoded);

      // Compress it using DEFLATE
      var deflate = new Zlib.RawDeflate(input_byte_array, {
        compressionType: 2
      }).compress();

      // Translate the compressed byte array to a base-64 encoded string
      return btoa(Compress.byteArrayToString(deflate));
    },

    /**
     * Convert to compressed fragments
     * @param data
     * @param fragment_size
     * @returns {string}
     */
    fragmentAndCompress: function (data, fragment_size) {
      fragment_size = fragment_size || 100000;

      var ret = "";

      // How many fragments should we break this string into?
      var fragment_count = parseInt(data.length / fragment_size) + 1;

      // Compress it as fragments of 100000 separated by _CMP_ tokens
      for (var i = 0; i < fragment_count; i++) {
        // Translate the compressed byte array to a base-64 encoded string
        var compressed_string = Compress.compress(data.substring(i * fragment_size, (i + 1) * fragment_size));

        // Add the compressed string to the payload
        ret += ("_CMP_" + compressed_string);
      }

      return ret;
    },

    /**
     * Decompress a string
     * @param datastr
     * @param decodingFn  ex: fs.enc, Compress._utf8_encode (default)
     */
    decompress: function (datastr, decodingFn) {
      var bytearr = Compress.stringToByteArray(atob(datastr)),
        inflator = new Zlib.RawInflate(bytearr, {
          index: 0,
          bufferSize: 41152,
          bufferType: Zlib.RawInflate.BufferType.ADAPTIVE,
          resize: true
        });
      
      var str = Compress.byteArrayToString(inflator.decompress());
      if (fs.isFunction(decodingFn)) {
        str = decodingFn(str);
      }
      return str;
    }
  };

  /**
   * Expose it to the world
   * @type {{byteArrayToString: byteArrayToString, stringToByteArray: stringToByteArray, _utf8_encode: _utf8_encode, compress: compress, fragmentAndCompress: fragmentAndCompress, decompress: decompress}}
   */
  utils.Compress = Compress;

})(utils);