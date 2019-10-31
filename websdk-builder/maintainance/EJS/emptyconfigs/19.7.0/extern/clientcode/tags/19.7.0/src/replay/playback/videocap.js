fs.provide("rp.Replay.Playback.VideoCapture");

(function () {

  /**
   * This uses the browser's WebRTC screen sharing getUserMedia API in order to
   * capture a .webm H264 video in chrome.
   *
   * This requires the simpleCapture browser extension to be installed and
   * either replay served over HTTPS or a flag specified on the command line
   * `--allow-http-screen-capture`.
   *
   * The video is either uploaded to the server if an uploadPort is provided
   * or a browser download is triggered. When uploaded to the server, the
   * video is split into 30 second chunks, so the server can have a timeout
   * if it hasn't received a chunk within 30 seconds.
   */
  function VideoCapture(params) {
    this.vwidth = params.vwidth;
    this.vheight = params.vheight;
    this.framerate = params.framerate;
    this.bitrate = params.bitrate;
    this.uploadPort = params.uploadPort;
    this.lastIndexTime = new Date();
    this.lastDuration = 0;
    this.recording = false;
    this.params = params;
    this.blobs = [];
    this.seq = 0;
    this.bufferDuration = 0;
  }

  /**
   * Pause screen capture
   * @returns {Promise}
   */
  VideoCapture.prototype.pause = function () {
    return this._awaitRecorderAction("pause");
  };

  /**
   * Resume screen capture
   * @returns {Promise}
   */
  VideoCapture.prototype.resume = function () {
    if (this.recorder && this.recorder.state === "paused") {
      return this._awaitRecorderAction("resume");
    }

    // has not started yet
    return this._awaitRecorderAction("start", 1500);
  };

  /**
   * Stop screen capture and trigger final upload/download of video file
   * @returns {Promise}
   */
  VideoCapture.prototype.stop = function () {
    this._stopBlobSplitTimer();
    return this._awaitRecorderAction("stop");
  };

  /**
   * Set up video capture
   * @returns {Promise}
   */
  VideoCapture.prototype.setup = function () {
    if (this.recorder) {
      return Promise.resolve();
    }

    this._setTitleToKnownValue();

    return this._getSourceId().
      then(function (sourceId) {
        this._restoreTitle();
        return this._getUserMedia(sourceId);
      }.bind(this)).
      then(this._setupMediaRecorder.bind(this)).
      catch(function (error) {
        this._restoreTitle();
        console.warn("Unable to capture video: " + error);
      }.bind(this));
  };

  /**
   * Set title to a know value so that when specifying
   * `--auto-select-desktop-capture-source=Choose-this-tab` on the
   * command line for chrome, it will click on this tab without
   * need for user interaction.
   * @private
   */
  VideoCapture.prototype._setTitleToKnownValue = function () {
    var titleEl = document.getElementsByTagName("title")[0];
    this.previousTitle = titleEl.innerHTML;
    titleEl.innerText = "Choose-this-tab";
  };

  /**
   * Restore previous title.
   * @private
   */
  VideoCapture.prototype._restoreTitle = function () {
    var titleEl = document.getElementsByTagName("title")[0];
    titleEl.innerHTML = this.previousTitle;
    delete this.previousTitle;
  };

  /**
   * Communicate with the simpleCapture browser extension if it exists.
   * @private
   * @returns {Promise<sourceId>} with the sourceId or null if unable to obtain it
   */
  VideoCapture.prototype._getSourceId = function () {
    return new Promise(function (resolve, reject) {
      // make sure we timeout if the extension isn't installed
      var timeout = setTimeout(function () {
        window.removeEventListener('message', onMessage);
        // failed to communicate with browser extension
        if (location.protocol !== "https:") {
          reject(new Error("Needs to be https"));
          return;
        }
        reject(new Error("Install simpleCapture browser extension"));
      }, 500);

      var onMessage = function (event) {
        if (event.origin !== window.location.origin) {
          return;
        }

        if (event.data === "ohai-webpage") {
          // We now know the extension exists so clear the timeout so
          // if it takes a while for the user to select which tab it's not
          // a big deal.
          clearTimeout(timeout);
          window.postMessage("get-simple-capture-source", "*");
        }

        if (!event.data.length && "sourceId" in event.data) {
          window.removeEventListener('message', onMessage);
          if (!event.data.sourceId) {
            reject(new Error("Permission denied (maybe need --allow-http-screen-capture?)"));
          } else {
            resolve(event.data.sourceId);
          }
        }
      };

      window.addEventListener('message', onMessage);

      // check if extension exists
      window.postMessage("ohai-simple-capture", "*");
    });
  };

  /**
   * Get the video capture stream using getUserMedia API.
   * @private
   */
  VideoCapture.prototype._getUserMedia = function (sourceId) {
    var constraints = {
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: sourceId,
          maxWidth: this.vwidth,
          maxHeight: this.vheight,
          maxFrameRate: this.framerate
        },
      }
    };
    console.log("Asking for these constraints: " + JSON.stringify(constraints, null, 2));

    return navigator.mediaDevices.getUserMedia(constraints);
  };

  /**
   * Use the MediaRecorder API to capture a video file from the video capture stream.
   * @private
   */
  VideoCapture.prototype._setupMediaRecorder = function (stream) {
    this.stream = stream;

    console.log(
      "Success getting a stream with these settings: " +
      JSON.stringify(stream.getVideoTracks()[0].getSettings(), null, 2)
    );

    this.recorder = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=h264",
      videoBitsPerSecond: this.bitrate
    });

    this.timeCodeStart = new Date();

    this.recorder.addEventListener("dataavailable", this._onDataAvailable.bind(this), false);
    this.recorder.addEventListener("start", function () {
      this.bufferDuration = (new Date()) - this.timeCodeStart;
    }.bind(this));
    this.recorder.addEventListener("stop", this._onRecordingStop.bind(this), false);
    this.recorder.addEventListener("stop", function () {
      this.recording = false;
    }.bind(this), false);
    this.recorder.addEventListener("pause", function () {
      this.recording = false;
      this.pauseTime = new Date();
    }.bind(this), false);
    this.recorder.addEventListener("error", this._onRecordingError.bind(this), false);
    this.recorder.addEventListener("start", function () {
      this.startTime = new Date();
      this.recording = true;
    }.bind(this), false);
    this.recorder.addEventListener("resume", function () {
      this.recording = true;
      this.pauseDuration = (new Date()) - this.pauseTime;
    }.bind(this), false);
  };

  /**
   * Update the current time index
   */
  VideoCapture.prototype.getDuration = function () {
    return /*((new Date()) - this.lastIndexTime) +*/ this.lastDuration/* - this.bufferDuration*/;
  };

  /**
   * When a blob of data becomes available from the recorder
   * @private
   */
  VideoCapture.prototype._onDataAvailable = function (evt) {
    this.lastIndexTime = new Date();
    this.lastDuration = evt.timeStamp - 2000;
    console.log("Data available: " + this.seq, evt.timeStamp, evt.timecode, this.getDuration());
    if (this.uploadPort) {
      this._uploadScreenCapture(evt.data);
    } else {
      this.blobs.push(evt.data);
    }
    this.seq += 1;
  };

  /**
   * When the recording stops, usually because replay is done playing, but
   * it can happen if an error occurrs too.
   * @private
   */
  VideoCapture.prototype._onRecordingStop = function (evt) {
    if (!this.uploadPort) {
      this._downloadScreenCapture();
    }

    this.blobs = [];
    this.recorder = null;
    this.stream.getTracks()[0].stop();
    this.stream = null;
  };

  /**
   * Handle recording errors
   * @private
   */
  VideoCapture.prototype._onRecordingError = function (evt) {
    console.log("Recording error: " + evt.message);
  };

  /**
   * Stop the blob splitting interval.
   * @private
   */
  VideoCapture.prototype._stopBlobSplitTimer = function () {
    if (this.blobSplitTimer) {
      clearInterval(this.blobSplitTimer);
      this.blobSplitTimer = null;
    }
  };

  /**
   * Wrap a recorder action in a promise
   * @private
   */
  VideoCapture.prototype._awaitRecorderAction = function (action, arg2) {
    var recorder = this.recorder;

    if (!recorder) {
      // ignore this: probably there was already an error message about it
      return Promise.resolve();
    }

    return new Promise(function (resolve, reject) {
      var success = function () {
        recorder.removeEventListener(action, success, false);
        recorder.removeEventListener("error", failure, false);
        resolve();
      }.bind(this);

      var failure = function () {
        recorder.removeEventListener(action, success, false);
        recorder.removeEventListener("error", failure, false);
        reject();
      }.bind(this);

      recorder.addEventListener(action, success, false);
      recorder.addEventListener("error", failure, false);

      if (action == "start") {
        this.recorder.start(arg2);
      } else {
        recorder[action]();
      }
    }.bind(this));
  };

  /**
   * Ask the browser to download the video file. This will only happen
   * if !uploadPort.
   * @private
   */
  VideoCapture.prototype._downloadScreenCapture = function () {
    // trigger download of video
    var blob = new Blob(this.blobs, { type: "video/webm" });
    var url = window.URL.createObjectURL(blob);

    var a = document.createElement("a");
    a.id = "fsrVideoDownloadLink";
    a.style = "display:none;";
    a.href = url;
    a.download = "recording-" + Date.now() + ".webm";
    a.innerText = "Download Video Here";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    window.URL.revokeObjectURL(url);
    // this is a special message that preplayer looks for to know we are done
    console.log("Replay entirely finished");
  };

  /**
   * Upload a chunk of video to the upload server.
   * @private
   */
  VideoCapture.prototype._uploadScreenCapture = function (data) {
    // serialize uploads
    if (this.uploading) {
      this.blobs.push(data);
      return;
    }
    this.uploading = true;

    var done = function () {
      this.uploading = false;
      if (this.blobs.length > 0) {
        // upload the next one
        this._uploadScreenCapture(this.blobs.shift());
      } else if (!this.recorder || this.recorder.state === "inactive") {
        this.finishUploading();
      }
    }.bind(this);

    // upload
    var url = "http://localhost:" + this.uploadPort + "/upload/" + this.seq;
    console.log("Uploading blob " + this.seq + " to " + url);

    // NOTE: must call _sendViaXHR to avoid running fs.ext() on the parameters, otherwise
    // the blob gets converted into "[object Object]"
    new utils.AjaxTransport()._sendViaXHR({
      method: "POST",
      url: url,
      contentType: "video/webm",
      skipEncode: true,
      data: data,
      success: done,
      failure: done
    });
  };

  /**
   * Tell the server we have sent it all the data it will ever get.
   * @private
   */
  VideoCapture.prototype.finishUploading = function () {
    var done = function () {
      // this is a special message that preplayer looks for to know we are done
      console.log("Replay entirely finished");
    }.bind(this);

    new utils.AjaxTransport().send({
      method: "POST",
      url: "http://localhost:" + this.uploadPort + "/upload/done",
      contentType: "video/webm",
      skipEncode: true,
      data: "",
      success: done,
      failure: done
    });
  };
})();