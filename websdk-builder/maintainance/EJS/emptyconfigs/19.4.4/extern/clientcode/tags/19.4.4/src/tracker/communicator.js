/**
 * Used for communicating between the window and other iframes in the same domain
 *
 * (c) Copyright 2015 Answers, Inc.
 *
 * @author Alexei White (alexei.white@answers.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("track.Communicator");

fs.require("track.Top");

(function (tracker) {

  /**
   * Holds the singleton of a communicator
   */
  var _comSingleton;

  /**
   * A communicator class
   * @param browser
   * @constructor
   */
  var Comms = function (browser) {
    if (_comSingleton) {
      return _comSingleton;
    } else {
      _comSingleton = this;
    }

    this.someCommunicationReceived = new utils.FSEvent();
    this.messageReceived = new utils.FSEvent();

    this.br = browser;
    this.useAlt = browser.isIE || browser.browser.name == 'Safari' || !browser.supportsLocalStorage;

    // Time between attempts
    this._trnsInterval = 25;

    this._altVals = {};

    if (this.useAlt) {
      /* pragma:DEBUG_START */
      console.warn("tracker: communicator is using cookie messaging");
      /* pragma:DEBUG_END */
      this._commands = {};
      var dm = utils.getRootDomain(); 
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
    // Set up the timer
    this._transportTimer = setInterval(fs.proxy(function () {
      var validator;
      if (this._ck) {
        validator = this._ck.get('_fsuid');
        if (validator) {
          this._ck.set('_fruid', validator);
        }
      } else {
        validator = localStorage.getItem('_fsuid');
        if (validator) {
          localStorage.setItem('_fruid', validator);
        }
      }
      if (validator) {
        /* pragma:DEBUG_START */
        console.log("tracker: validated open communication channel with parent window!");
        /* pragma:DEBUG_END */
        this._init();
      }
    }, this), this._trnsInterval * 5);
  };

  /**
   * Finish initialization
   * @private
   */
  Comms.prototype._init = function () {
    clearInterval(this._transportTimer);
    if (this._ck) {
      this._cktimer = setInterval(fs.proxy(function () {
        var msg = this._ck.get('fsmsg');
        if (msg) {
          /* pragma:DEBUG_START */
          console.log("tracker: communicator: received msg: " + msg);
          /* pragma:DEBUG_END */
          this.someCommunicationReceived.fire();
          msg = JSON.parse(msg);
          this._ck.kill('fsmsg');
          this._ck.set('fsmsgrec', msg.id);
          if (!this._commands[msg.t]) {
            this._commands[msg.t] = {
              t: msg.t,
              k: msg.k,
              d: []
            };
          }
          this._commands[msg.t].d.push(msg.d);
          if (msg.f) {
            /* pragma:DEBUG_START */
            console.log("tracker: communicator: got the whole message from cookies: " + msg.k);
            /* pragma:DEBUG_END */
            // Its done
            this._altVals[msg.k] = JSON.parse(utils.Compress.decompress(this._commands[msg.t].d.join('')));
            this.messageReceived.fire(msg.k, this._altVals[msg.k].v);
          }
        }
      }, this), this._trnsInterval);
    } else if (this.br.supportsLocalStorage) {
      /* pragma:DEBUG_START */
      console.warn("tracker: communicator: communicator is using localStorage communication");
      /* pragma:DEBUG_END */
      this._lsT = setInterval(fs.proxy(function () {
        for (var key in localStorage) {
          if (key.indexOf('__fsFr__') > -1) {
            key = key.replace('__fsFr__', '');
            this.get(key);
          }
        }
      }, this), 150);
    }
  };

  /**
   * Set a value
   * @param key
   * @param val
   */
  Comms.prototype.set = function (key, val) {
    this._altVals[key] = val;
    if (this._ck) {
      this._ck.set(key, val);
    }
    if (this.br.supportsLocalStorage) {
      localStorage.setItem(key, val);
    }
  };

  /**
   * Extract the value from the local cache
   * @param key
   * @private
   */
  Comms.prototype._extractValFromAlt = function (key) {
    if (this._altVals[key]) {
      if (this._altVals[key].x) {
        if ((new Date()).getTime() > this._altVals[key].x) {
          delete this._altVals[key];
          return;
        }
      }
      return this._altVals[key].v;
    }
  };

  /**
   * Perform maintenance on keys
   * @returns {*|null|String}
   * @private
   */
  Comms.prototype._maint = function () {
    var nw = utils.now();
    for (var key in this._altVals) {
      if (this._altVals[key].x && this._altVals[key].x < nw) {
        /* pragma:DEBUG_START */
        console.log("tracker: communicator: _maint() is removing " + key + " because " + this._altVals[key].x + " vs " + nw);
        /* pragma:DEBUG_END */
        delete this._altVals[key];
      }
    }
  };

  /**
   * Get a value
   * @param key
   * @param val
   */
  Comms.prototype.get = function (key) {
    this._maint();
    var res = this._extractValFromAlt(key);
    if (!res && this.br.supportsLocalStorage) {
      var lkey = "__fsFr__" + key,
        lval = localStorage.getItem(lkey);
      if (lval) {
        lval = JSON.parse(decodeURIComponent(lval));
        this._altVals[key] = lval;
        localStorage.removeItem(lkey);
        var nw = (new Date()).getTime();
        if (lval.x && lval.x < nw) {
          /* pragma:DEBUG_START */
          console.warn("tracker: communicator: deleting val \"" + key + "\" because ", lval.x);
          /* pragma:DEBUG_END */
          delete this._altVals[key];
          this.messageReceived.fire();
        } else {
          this.messageReceived.fire(key, lval.v);
        }
      }
    }
    return this._extractValFromAlt(key);
  };

  /**
   * Delete a value
   * @param key
   * @param val
   */
  Comms.prototype.kill = function (key) {
    /* pragma:DEBUG_START */
    console.warn("tracker: communicator: killing ", key);
    /* pragma:DEBUG_END */
    if (this._ck) {
      this._ck.kill(key);
    }
    if (this.br.supportsLocalStorage) {
      localStorage.removeItem(key);
      localStorage.removeItem("__fsFr__" + key);
    }
    delete this._altVals[key];
  };

})(tracker);
