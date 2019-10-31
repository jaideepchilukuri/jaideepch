/**
 * Performs health checks on the server for specific services
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.Utils.Network.Health");

fs.require("fs.Top");
fs.require("fs.Utils.Dom.Frame");

(function (utils) {

  /**
   * Holds the last healthy status
   * @type {{}}
   * @private
   */
  var ___healthyInfo;

  /**
   * CORS connection for health
   */
  var ___healthCORS;

  /**
   * Take the health result and handle it
   * @param deps
   * @param success
   * @param failure
   * @private
   */
  var ___handleHealthResult = function (deps, success, failure) {
    var depInfo = [],
      passnames = [],
      failnames = [];
    for (var i = 0; i < deps.length; i++) {
      var depi = ___healthyInfo.info[deps[i]];
      if (!depi || depi.up === true) {
        depInfo.push(fs.ext({}, depi));
        passnames.push(deps[i]);
      } else {
        failnames.push(deps[i]);
      }
    }
    if (failnames.length > 0) {
      /* pragma:DEBUG_START */
      console.warn("utils: health check failed on " + failnames.join(', '));
      /* pragma:DEBUG_END */
      failure(failnames);
    } else {
      success(depInfo);
    }
  };

  /**
   * Does health checking against the server.
   * @param browser {Browser} The Browser instance
   * @param dependencies {Array or String} The array of service dependencies
   * @param success {Function} What to call when this is successful
   * @param failure {Function} (Optional) What to call if this is unsuccessful
   * @constructor
   */
  utils.Healthy = function (browser, dependencies, success, failure) {
    // Array-ify the dependencies group
    if (!Array.isArray(dependencies)) {
      dependencies = [dependencies];
    }
    success = success || function () {
    };
    failure = failure || function () {
    };

    if (!___healthyInfo && browser.supportsLocalStorage) {
      var hs = localStorage.getItem('_fsrHealthStatus');
      ___healthyInfo = hs ? JSON.parse(hs) : {};
    }

    // Sixty second staleness
    if (___healthyInfo && ___healthyInfo.last && utils.now() - ___healthyInfo.last < 60000) {
      fs.nextTick(function () {
        ___handleHealthResult(dependencies, success, failure);
      });
    } else {
      // Holds the CORS abstraction
      if (!___healthCORS) {
        ___healthCORS = new utils.AjaxTransport();
      }
      ___healthCORS.send({
        method: 'GET',
        url: location.protocol + '//health.foresee.com',
        timeout: 10000,
        failure: fs.proxy(function () {
          /* pragma:DEBUG_START */
          console.warn("utils: health check failed on " + dependencies.join(', '));
          /* pragma:DEBUG_END */
          failure(dependencies);
        }, this),
        success: fs.proxy(function (result) {
          if (fs.isString(result) && result.length > 3) {
            ___healthyInfo = {
              last: utils.now(),
              info: JSON.parse(result)
            };
            if (browser.supportsLocalStorage) {
              localStorage.setItem('_fsrHealthStatus', JSON.stringify(___healthyInfo));
            }
            ___handleHealthResult(dependencies, this.s, this.f);
          } else {
            /* pragma:DEBUG_START */
            console.warn("utils: health check failed on " + dependencies.join(', '), result);
            /* pragma:DEBUG_END */
            failure(dependencies);
          }
        }, { deps: dependencies, s: success, f: failure })
      });
    }
  };

  /**
   * Get the health status of specific endpoints. Will return irrespective of whether they are up or down.
   * @param browser
   * @param dependencies
   * @param callback
   * @constructor
   */
  utils.HealthStatus = function (browser, dependencies, callback) {
    var handler = function (deps, cb) {
      return function () {
        var res = {};
        for (var i = 0; i < deps.length; i++) {
          var tmp = {
            up: false
          };
          if (___healthyInfo && ___healthyInfo.info && ___healthyInfo.info[deps[i]]) {
            tmp = fs.ext({}, ___healthyInfo.info[deps[i]]);
          }
          res[deps[i]] = tmp;
        }
        callback(res);
      };
    }(dependencies, callback);
    utils.Healthy(browser, dependencies, handler, handler);
  };

})(utils);
