/**
 * Used for communicating between the window and other iFrames in the same domain
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("frame.Communicator");

fs.require("frame.Top");

(function () {

  /**
   * A communicator class
   * @param browser
   * @constructor
   */
  var Comms = function (browser, id) {
    /* pragma:DEBUG_START */
    if (!id) {
      console.error("frame: missing id in communicator!");
    }
    /* pragma:DEBUG_END */

    this.br = browser;
    this.useAlt = browser.isIE || browser.browser.name == 'Safari' || !browser.supportsLocalStorage;

    this._bidID = 1;
    this._id = id;

    // Max cookie size
    this._stgLimit = 900;

    // Interval between attempts to set
    this._trnsInterval = 25;
    this.altBits = [];
    this._localSets = [];
    this.channelOpen = new utils.FSEvent();
  };

  /**
   * Initialization
   */
  Comms.prototype.init = function () {
    if (this.useAlt) {
      /* pragma:DEBUG_START */
      console.warn("frame: communicator is using cookie messaging");
      /* pragma:DEBUG_END */
      var dm = fs.toLowerCase(window.location.host.toString()).replace(/www\./gi, '');
      if (dm.indexOf(':') > -1) {
        dm = dm.substr(0, dm.indexOf(':'));
      }
      this._stg = {};
      var expireDate = new Date();
      expireDate.setTime(expireDate.getTime() + (365 * 24 * 60 * 60 * 1000));
      var psets = {
        'path': '/',
        'domain': dm,
        'secure': false,
        'encode': true,
        'expires': expireDate.toGMTString()
      };
      this._ck = new utils.Cookie(psets);
    }
    /* pragma:DEBUG_START */
    console.log("frame: waiting for readiness from the tracker window before we start comms");
    /* pragma:DEBUG_END */
    this._transportTimer = setInterval(fs.proxy(function () {
      var validator;
      if (this._ck) {
        this._ck.set('_fsuid', this._id);
        validator = this._ck.get('_fruid');
      } else {
        localStorage.setItem('_fsuid', this._id);
        validator = localStorage.getItem('_fruid');
      }
      if (validator == this._id) {
        /* pragma:DEBUG_START */
        console.log("frame: validator was equal", validator, "vs", this._id);
        /* pragma:DEBUG_END */
        this._finishInit();
      }
    }, this), this._trnsInterval * 5);
  };

  /**
   * Finish the initialization after a handshake has been achieved
   * @private
   */
  Comms.prototype._finishInit = function () {
    var didSendOne = false,
      bit;

    /* pragma:DEBUG_START */
    console.log("frame: achieved communication with tracker");
    /* pragma:DEBUG_END */
    clearInterval(this._transportTimer);
    if (this._ck) {
      /* pragma:DEBUG_START */
      console.log("frame: starting cookie timer");
      /* pragma:DEBUG_END */
      this._transportTimer = setInterval(fs.proxy(function () {
        if (this.altBits.length > 0) {
          var lastrec = this._ck.get('fsmsgrec');
          if (lastrec || !didSendOne) {
            didSendOne = true;
            this._ck.kill('fsmsgrec');
            bit = JSON.stringify(this.altBits.shift());
            /* pragma:DEBUG_START */
            console.log("frame: transmitting via cookie: " + bit);
            /* pragma:DEBUG_END */
            this._ck.set('fsmsg', bit);
          }
        }
      }, this), this._trnsInterval);
    } else {
      /* pragma:DEBUG_START */
      console.log("frame: starting localstorage timer");
      /* pragma:DEBUG_END */
      if (this.br.supportsLocalStorage) {
        this._transportTimer = setInterval(fs.proxy(function () {
          while (this._localSets.length > 0) {
            var evt = this._localSets.pop();
            if (this.br.supportsLocalStorage) {
              localStorage.setItem("__fsFr__" + evt.key, evt.val);
            }
          }
        }, this), 150);
      }
    }

    // Signal ready
    this.channelOpen.fire();
  };

  /**
   * Set a value
   * @param key
   * @param val
   * @param exp
   */
  Comms.prototype.set = function (key, val, exp) {
    if (typeof(val) != 'string') {
      val = JSON.stringify({v: val, x: exp});
    }
    this._localSets.push({
      key: key,
      val: val,
      exp: exp
    });

    if (this._ck) {
      this.channelOpen.subscribe(fs.proxy(function () {
        this._stg[key] = val;
        var encval = utils.Compress.compress(val),
          tig = '_' + Math.round(Math.random() * 9999999);
        while (encval.length > 0) {
          this.altBits.push({
            id: this._bidID++,
            t: tig,
            k: key,
            d: encval.substr(0, Math.min(this._stgLimit, encval.length)),
            f: (encval.length <= this._stgLimit)
          });
          encval = encval.substr(Math.min(this._stgLimit, encval.length));
        }
      }, this), true, true);
    }
  };

  /**
   * Get a value
   * @param key
   * @param val
   */
  Comms.prototype.get = function (key) {
    var res;
    if (this._ck) {
      res = this._ck.get(key);
    }
    if (!res && this.br.supportsLocalStorage) {
      res = localStorage.getItem(key);
    }
    return res;
  };

  /**
   * Delete a value
   * @param key
   * @param val
   */
  Comms.prototype.kill = function (key) {
    if (this._ck) {
      this._ck.kill(key);
    }
    if (this.br.supportsLocalStorage) {
      localStorage.removeItem(key);
    }
  };

})(trigger);