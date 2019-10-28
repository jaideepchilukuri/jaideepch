/**
 * Image transport.
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.Utils.Network.Image");

fs.require("fs.Top");

(function (utils) {

  /**
   * @class Create a new instance of an Image transport.  Pass a default set of options to use
   *        when calling the {@link #send} method.  Options:
   *        <ul>
   *          <li>url - Transport destination URL</li>
   *          <li>data - Data object to send to URL</li>
   *          <li>success - Success callback function. Called upon successful completion of transport, passed
   *              "payload" object as only argument, called in the scope of the transport itself.</li>
   *          <li>failure - Failure callback function.  Called when transport fails, passed "status" code as
   *              only argument, called in the scope of the transport itself.</li>
   *        </ul>
   *
   * @param [options] {Object} An optional set of configuration values which can be
   *      overridden by each call to {@link #send}
   */
  utils.ImageTransport = function (options) {
    // The default set of XMLHttpRequest options
    var _defaultImgOptions = {
      data: {},
      success: function () {
      },
      failure: function () {
      }
    };
    this.options = fs.ext(_defaultImgOptions, options);
  };

  /**
   * Call the transport method to send data from the client to the server.  Options:
   *        <ul>
   *          <li>url - Transport destination URL</li>
   *          <li>data - Data object to send to URL</li>
   *          <li>success - Success callback function. Called upon successful completion of transport, passed
   *              "payload" object as only argument, called in the scope of the transport itself.</li>
   *          <li>failure - Failure callback function.  Called when transport fails, passed "status" code as
   *              only argument, called in the scope of the transport itself.</li>
   *        </ul>
   *
   * @param [opts] {Object} Send option values.  If no different from those
   *      set during transport construction, only need to pass new "data" perhaps.
   */
  utils.ImageTransport.prototype.send = function (opts) {
    var sendOptions = fs.ext(this.options, opts);
    var img = new Image();
    img.onerror = sendOptions.failure;
    img.onload = function() {
      sendOptions.success({width: img.width, height: img.height});
    };
    img.src = fs.toQueryString(sendOptions.data, sendOptions.url, false);
  };

})(utils);