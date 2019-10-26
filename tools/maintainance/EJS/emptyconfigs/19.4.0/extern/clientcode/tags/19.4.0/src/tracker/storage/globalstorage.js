/**
 * Simplified Global Storage.
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("track.Storage.GlobalStorage");

fs.require("track.Top");

(function (utils) {

  /**
   * Creates a new instance of a global storage
   * @constructor
   */
  var GlobalStorage = function(configdata, browser) {
    this.cfg = configdata.cfg.config;
    this.cm = new Comms(browser);
  };

  /**
   * Gets an item from global storage
   * @param key
   */
  GlobalStorage.prototype.get = function(key) {
    var res = this.cm.get(this.cfg.site_id);
    if (res) {
      res = JSON.parse(res);
      if (res['acs.t']) {
        res = JSON.parse(res['acs.t']);
        return res[key];
      }
    }
  };

})(utils);