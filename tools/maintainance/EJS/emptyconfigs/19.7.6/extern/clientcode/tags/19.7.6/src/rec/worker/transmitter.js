/**
 * Transmit data to the servers
 *
 * (c) Copyright 2018 ForeSee, Inc.
 *
 */

fs.provide("rec.Worker.Transmitter");

fs.require("rec.Top");

(function () {

  // After this amount of transmission failures, it is considered worthless to try any more. The session must end.
  // Note: 5xx XHR errors are considered fatal and will override this limit mechanism.
  var MAXIMUM_FAILED_TRANSMISSIONS = 20;

  // To spare the servers, each upload will contain this number or fewer packets per payload.
  var MAXIMUM_PACKETS_PER_PAYLOAD = 3;
  // Minimum time between uploading packets
  var DELAY_BETWEEN_PACKETS = 500;

  /**
   * Handle reliable transmission of data to the server.
   */
  function Transmitter(sesh) {
    fs.ext(this, {
      sesh: sesh,
      siteId: fs.toLowerCase(sesh.siteId.replace(/[^a-zA-Z0-9]*/g, "")),
      _shouldTransmit: false,
      _isTransmitting: false,
      _gotFirstPacket: false,
      _failedTransmits: 0,
      _prevTimestamp: utils.now(),
    }, false);

    // Handle when transmitting is supposed to begin
    sesh.beginTransmitting.subscribe(this._startTransmitting.bind(this), true, true);

    // If the storage becomes full, we will attempt to delete previous
    // pages of data
    sesh._storage.StorageFull.subscribe(this._emptyStorage.bind(this), false, false);
  }

  /**
   * Enqueue a packet of data to be sent to the server and maybe
   * send it.
   */
  Transmitter.prototype.enqueue = function (data) {
    this.save(data);

    // signal that we got the pagemarker packet
    this._gotFirstPacket = true;

    // Try to send data
    this._transmit();
  };

  /**
   * Save the data given but don't attempt to send it.
   */
  Transmitter.prototype.save = function (data) {
    if (this.sesh.DONOTRECORD) return;

    var stg = this.sesh._storage,
      pls = stg.get("rpls") || [];

    pls.push({
      "when": this._getMonotonicTimestamp(),
      "data": data,
      "pn": this.sesh.getPageNum()
    });
    stg.set("rpls", pls);
    stg.commit();
  };

  /**
   * Dispose of the transmitter
   */
  Transmitter.prototype.dispose = function () {
    if (this._shouldTransmit && !this.sesh.DONOTRECORD) {
      this._sendAllWithoutWaiting();
    }
  };

  /**
   * Handle when we should actually begin transmitting.
   */
  Transmitter.prototype._startTransmitting = function () {
    /* pragma:DEBUG_START */
    console.log('sr: ' + (window === window.top ? '' : '[frm] ') + 'initiating transmit to server');
    /* pragma:DEBUG_END */

    this._shouldTransmit = true;

    // if we have the page marker packet, transmit right now
    // otherwise we will wait for that packet first
    if (this._gotFirstPacket) {
      this._transmit();
    }
  };

  /**
   * Handle storage being full. If we can transmit we will, otherwise
   * we will delete the oldest stored page data.
   */
  Transmitter.prototype._emptyStorage = function () {
    if (this._shouldTransmit) return this._actuallyTransmit();

    // TODO: maybe check if feedback record is enabled somehow
    // and in that case send data to the server instead of deleting it

    var stg = this.sesh._storage,
      pls = stg.get("rpls") || [];

    // Only delete whole pages
    if (pls.length > 0) {
      var oldestPageNum = pls[0].pn;
      while (pls[0].pn === oldestPageNum) {
        pls.shift(); // delete oldest
      }
    }

    // save it
    stg.set("rpls", pls);
    stg.commit();
  };

  /**
   * Send data to the recording endpoint
   */
  Transmitter.prototype._transmit = function () {
    if (this._shouldTransmit) {
      this._actuallyTransmit();
    }
  };

  /**
   * Flings the data on unload. This will result in duplicate data
   * more often than not, but it will prevent data loss so it's
   * worth it.
   */
  Transmitter.prototype._sendAllWithoutWaiting = function () {
    var stg = this.sesh._storage;
    var pls = stg.get("rpls") || [];

    if (pls.length) {
      /* pragma:DEBUG_START */
      var bytes = JSON.stringify(pls).length;
      console.log('sr: flinging ' + pls.length + ' packets (' + bytes + ' bytes) at the server before unload!');
      /* pragma:DEBUG_END */

      utils.sendWithoutWaiting(this._buildUrl(), { data: pls }, true);
    }
  };

  /**
   * Build the url for the record endpoint
   */
  Transmitter.prototype._buildUrl = function () {
    // TODO not use Singletons.jrny because Journeys are specific to products
    return fs.config.recUrl +
      "rest/web/event/" +
      fs.enc(Singletons.jrny.customerId) + "/" +
      fs.enc(this.sesh.getGlobalId()) + "/" +
      fs.enc(this.sesh.getSessionId()) +
      "?domain=" + fs.enc(document.domain) +
      "&site_id=" + fs.enc(this.siteId) +
      "&version=" + fs.enc(fs.config.codeVer == "symlink" ? "19.7.0" : fs.config.codeVer);
  };

  /**
   * Send the current buffer
   */
  Transmitter.prototype._actuallyTransmit = function () {
    var sesh = this.sesh,
      str = this.sesh._storage,
      pls = str.get("rpls") || [],
      payload = null;

    // Only transmit if there is something to transmit
    if (pls.length < 1) return;
    // Only transmit one at a time
    if (this._isTransmitting) return;

    /* pragma:DEBUG_START */
    console.assert(
      this._isTransmitting === false,
      "sr: this._isTransmitting is expected to be false before starting an actual transmit",
      JSON.stringify(this._isTransmitting)
    );
    /* pragma:DEBUG_END */

    this._isTransmitting = true;

    // Prepare the payload to be sent
    if (pls.length <= MAXIMUM_PACKETS_PER_PAYLOAD) {
      payload = { data: pls };
    } else {
      payload = { data: pls.slice(0, MAXIMUM_PACKETS_PER_PAYLOAD) };
    }

    /* pragma:DEBUG_START */
    var bytes = JSON.stringify(payload).length;
    this._totalBytes = (this._totalBytes || 0) + bytes;

    console.log(['sr: ', (window === window.top ? '' : '[frm] '),
      '>>> actually sending ', payload.data.length, '/', pls.length, ' packets to the server (', bytes, ' b out of ', this._totalBytes, ' b total) >>>'].join(""));
    /* pragma:DEBUG_END */

    // Perform the send
    var ajax = new utils.AjaxTransport();
    ajax.send({
      method: "POST",
      contentType: "application/json",
      url: this._buildUrl(),
      data: payload,

      failure: function (result, errorCode) {
        this._isTransmitting = false;

        // Log the transmit fail event
        Singletons.jrny.addEventString(RECLOGGING.RECORDER_TRANSMIT_FAILED);

        // 5xx error code are considered fatal and must stop any transmission to relieve the servers
        if (~~(errorCode / 100) === 5) {
          this._failedTransmits = MAXIMUM_FAILED_TRANSMISSIONS;
        }
        else {
          this._failedTransmits++;
        }

        /* pragma:DEBUG_START */
        console.error("sr: " + (window === window.top ? '' : '[frm] ') + "transport failed!", "(" + this._failedTransmits + " failures)");
        /* pragma:DEBUG_END */

        if (this._failedTransmits > MAXIMUM_FAILED_TRANSMISSIONS) {
          /* pragma:DEBUG_START */
          console.error("sr: " + (window === window.top ? '' : '[frm] ') + "too many failed transmits! Cancelling.");
          /* pragma:DEBUG_END */

          if (sesh) {
            // it could be that this has already been disposed (which deletes sesh)
            // which can trigger one final attempt to save the data
            sesh.endSession();
          }
        }
      }.bind(this),

      success: function (result) {
        result = JSON.parse(result);

        if (result.ids) {
          pls = str.get("rpls") || [];
          pls = pls.filter(function (idb) {
            return result.ids.indexOf(idb.when) == -1;
          });
          str.set("rpls", pls);
        }

        // Stop there when the list of packets is depleted
        // or if this should not be transmitting anymore.
        if (pls.length < 1 || !this._shouldTransmit) {
          this._isTransmitting = false;
          return;
        }

        // Go on with the rest of the waiting packets
        setTimeout(function () {
          this._isTransmitting = false;
          this._actuallyTransmit();
        }.bind(this), DELAY_BETWEEN_PACKETS);

      }.bind(this)
    });

  };

  /**
   * Date.now() is not monotonic -- it can go backwards as the system time
   * is adjusted to keep in step with internet time. This function is a bit
   * of a work around for that limitation so if the system time goes backwards
   * this will degrade into a glorified sequence counter until the system time
   * passes where it used to be.
   */
  Transmitter.prototype._getMonotonicTimestamp = function () {
    var nextTimestamp = utils.now();
    if (nextTimestamp <= this._prevTimestamp) {
      /* pragma:DEBUG_START */
      console.error("sr:", "Detected system time going backwards or duplicating!!! (fixing)");
      /* pragma:DEBUG_END */

      nextTimestamp = this._prevTimestamp + 1;
    }
    this._prevTimestamp = nextTimestamp;
    return nextTimestamp;
  };

})();