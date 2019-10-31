/**
 * SessionReplay Video Capture module
 *
 * Captures video with WebRTC
 *
 * (c) Copyright 2018 Foresee, Inc.
 */

import { AjaxTransport, Browser } from "../../utils/utils";

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
class VideoCapture {
  constructor(params) {
    this.vwidth = params.vwidth;
    this.vheight = params.vheight;
    this.framerate = params.framerate;
    this.bitrate = params.bitrate;
    this.uploadPort = params.uploadPort;
    this.recording = false;
    this.params = params;
    this.blobs = [];
    this.seq = 0;
    this.asked = false;

    this.startTime = -1;
    this.timeOffset = 0;
  }

  /**
   * Pause screen capture
   * @returns {Promise}
   */
  pause() {
    return this._awaitRecorderAction("pause");
  }

  /**
   * Resume screen capture
   * @returns {Promise}
   */
  resume() {
    if (this.recorder && this.recorder.state === "paused") {
      return this._awaitRecorderAction("resume");
    }

    // has not started yet
    return this._awaitRecorderAction("start", 10000);
  }

  /**
   * Stop screen capture and trigger final upload/download of video file
   * @returns {Promise}
   */
  stop() {
    return this._awaitRecorderAction("stop");
  }

  /**
   * Set up video capture
   * @returns {Promise}
   */
  setup() {
    if (this.recorder) {
      return Promise.resolve();
    }

    // only do this the first page
    if (this.asked) {
      return Promise.resolve();
    }
    this.asked = true;

    this._setTitleToKnownValue();

    const browserVer = new Browser().browser.version;

    // chrome now supports a standards compliant way to do this
    if (browserVer > 73 && navigator.mediaDevices && navigator.mediaDevices.getDisplayMedia) {
      return this.standardSetup();
    }

    return this._getSourceId()
      .then(sourceId => {
        this._restoreTitle();
        return this._getUserMedia(sourceId);
      })
      .then(this._setupMediaRecorder.bind(this))
      .catch(error => {
        this._restoreTitle();
        console.warn(`Unable to capture video: ${error}`);
      });
  }

  standardSetup() {
    const constraints = {
      audio: false,
      video: {
        displaySurface: "browser",
        width: { ideal: this.vwidth },
        height: { ideal: this.vheight },
        frameRate: { ideal: this.framerate },
      },
    };
    return navigator.mediaDevices
      .getDisplayMedia(constraints)
      .then(ms => {
        this._restoreTitle();
        return this._setupMediaRecorder(ms);
      })
      .catch(error => {
        this._restoreTitle();
        console.warn(`Unable to capture video: ${error}`);
      });
  }

  /**
   * Set title to a know value so that when specifying
   * `--auto-select-desktop-capture-source=Choose-this-tab` on the
   * command line for chrome, it will click on this tab without
   * need for user interaction.
   * @private
   */
  _setTitleToKnownValue() {
    const titleEl = document.getElementsByTagName("title")[0];
    this.previousTitle = titleEl.innerHTML;
    titleEl.innerText = "Choose-this-tab";
  }

  /**
   * Restore previous title.
   * @private
   */
  _restoreTitle() {
    const titleEl = document.getElementsByTagName("title")[0];
    titleEl.innerHTML = this.previousTitle;
    delete this.previousTitle;
  }

  /**
   * Communicate with the simpleCapture browser extension if it exists.
   * @private
   * @returns {Promise<sourceId>} with the sourceId or null if unable to obtain it
   */
  _getSourceId() {
    return new Promise((resolve, reject) => {
      // make sure we timeout if the extension isn't installed
      const timeout = setTimeout(() => {
        window.removeEventListener("message", onMessage);
        // failed to communicate with browser extension
        if (location.protocol !== "https:") {
          reject(new Error("Needs to be https"));
          return;
        }
        reject(new Error("Install simpleCapture browser extension"));
      }, 500);

      function onMessage(event) {
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
          window.removeEventListener("message", onMessage);
          if (!event.data.sourceId) {
            reject(new Error("Permission denied (maybe need --allow-http-screen-capture?)"));
          } else {
            resolve(event.data.sourceId);
          }
        }
      }

      window.addEventListener("message", onMessage);

      // check if extension exists
      window.postMessage("ohai-simple-capture", "*");
    });
  }

  /**
   * Get the video capture stream using getUserMedia API.
   * @private
   */
  _getUserMedia(sourceId) {
    const constraints = {
      audio: false,
      video: {
        mandatory: {
          chromeMediaSource: "desktop",
          chromeMediaSourceId: sourceId,
          maxWidth: this.vwidth,
          maxHeight: this.vheight,
          maxFrameRate: this.framerate,
        },
      },
    };
    console.log(`Asking for these constraints: ${JSON.stringify(constraints, null, 2)}`);

    return navigator.mediaDevices.getUserMedia(constraints);
  }

  /**
   * Use the MediaRecorder API to capture a video file from the video capture stream.
   * @private
   */
  _setupMediaRecorder(stream) {
    this.stream = stream;

    console.log(
      `Success getting a stream with these settings: ${JSON.stringify(
        stream.getVideoTracks()[0].getSettings(),
        null,
        2
      )}`
    );

    this.recorder = new MediaRecorder(stream, {
      mimeType: "video/webm;codecs=h264",
      videoBitsPerSecond: this.bitrate,
    });

    this.recorder.addEventListener("dataavailable", this._onDataAvailable.bind(this), false);
    this.recorder.addEventListener("stop", this._onRecordingStop.bind(this), false);
    this.recorder.addEventListener("error", this._onRecordingError.bind(this), false);
    this.recorder.addEventListener(
      "start",
      evt => {
        this.blobs = [];
        this.timeOffset = 0;
        this.startTime = evt.timeStamp;
        this.recording = true;
      },
      false
    );
    this.recorder.addEventListener(
      "stop",
      evt => {
        if (this.startTime > -1) {
          this.timeOffset += evt.timeStamp - this.startTime;
        }
        this.startTime = -1;
        this.recording = false;
      },
      false
    );
    this.recorder.addEventListener(
      "resume",
      evt => {
        if (this.startTime < 0) {
          this.startTime = evt.timeStamp;
        }
        this.recording = true;
      },
      false
    );
    this.recorder.addEventListener(
      "pause",
      evt => {
        if (this.startTime > -1) {
          this.timeOffset += evt.timeStamp - this.startTime;
        }
        this.startTime = -1;
        this.recording = false;
      },
      false
    );
  }

  /**
   * Get the current duration of video thus recorded
   */
  getDuration() {
    if (this.startTime < 0) {
      return this.timeOffset;
    }
    return this.timeOffset + (performance.now() - this.startTime);
  }

  /**
   * When a blob of data becomes available from the recorder
   * @private
   */
  _onDataAvailable(evt) {
    console.log(`Data available: ${this.seq} duration here: ${this.getDuration()}`);
    if (this.uploadPort) {
      this._uploadScreenCapture(this.seq, evt.data);
    } else {
      this.blobs.push(evt.data);
    }
    this.seq += 1;
  }

  /**
   * When the recording stops, usually because replay is done playing, but
   * it can happen if an error occurrs too.
   * @private
   */
  _onRecordingStop() {
    if (!this.uploadPort) {
      this._downloadScreenCapture();
    }

    this.recorder = null;
    this.stream.getTracks()[0].stop();
    this.stream = null;
  }

  /**
   * Handle recording errors
   * @private
   */
  _onRecordingError(evt) {
    console.log(`Recording error: ${evt.message}`);
  }

  /**
   * Wrap a recorder action in a promise
   * @private
   */
  _awaitRecorderAction(action, arg2) {
    const recorder = this.recorder;

    if (!recorder) {
      // ignore this: probably there was already an error message about it
      return Promise.resolve();
    }

    return new Promise((resolve, reject) => {
      const success = () => {
        recorder.removeEventListener(action, success, false);
        recorder.removeEventListener("error", failure, false);
        resolve();
      };

      function failure() {
        recorder.removeEventListener(action, success, false);
        recorder.removeEventListener("error", failure, false);
        reject(new Error("Failed to start recording"));
      }

      recorder.addEventListener(action, success, false);
      recorder.addEventListener("error", failure, false);

      if (action == "start") {
        this.recorder.start(arg2);
      } else {
        recorder[action]();
      }
    });
  }

  /**
   * Ask the browser to download the video file. This will only happen
   * if !uploadPort.
   * @private
   */
  _downloadScreenCapture() {
    // trigger download of video
    const blob = new Blob(this.blobs, { type: "video/webm" });
    const url = window.URL.createObjectURL(blob);

    const a = document.createElement("a");
    a.id = "fsrVideoDownloadLink";
    a.style = "display:none;";
    a.href = url;
    a.download = `recording-${Date.now()}.webm`;
    a.innerText = "Download Video Here";
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);

    window.URL.revokeObjectURL(url);
    // this is a special message that preplayer looks for to know we are done
    console.log("Replay entirely finished");
  }

  /**
   * Upload a chunk of video to the upload server.
   * @private
   */
  _uploadScreenCapture(seq, data) {
    // serialize uploads
    if (this.uploading) {
      this.blobs.push({ seq, data });
      return;
    }
    this.uploading = true;

    const done = () => {
      this.uploading = false;
      if (this.blobs.length > 0) {
        this.blobs.sort((a, b) => a.seq - b.seq);
        const next = this.blobs.shift();

        // upload the next one
        this._uploadScreenCapture(next.seq, next.data);
      } else if (!this.recorder || this.recorder.state === "inactive") {
        this.finishUploading();
      }
    };

    // upload
    const url = `http://localhost:${this.uploadPort}/upload/${seq}`;
    console.log(`Uploading blob ${seq} to ${url}`);

    // NOTE: must call _sendViaXHR to avoid running fs.ext() on the parameters, otherwise
    // the blob gets converted into "[object Object]"
    new AjaxTransport()._sendViaXHR({
      method: "POST",
      url,
      contentType: "video/webm",
      skipEncode: true,
      data,
      success: done,
      failure: done,
    });
  }

  /**
   * Tell the server we have sent it all the data it will ever get.
   * @private
   */
  finishUploading() {
    const done = () => {
      // this is a special message that preplayer looks for to know we are done
      console.log("Replay entirely finished");
    };

    new AjaxTransport().send({
      method: "POST",
      url: `http://localhost:${this.uploadPort}/upload/done`,
      contentType: "video/webm",
      skipEncode: true,
      data: "",
      success: done,
      failure: done,
    });
  }
}

export { VideoCapture };
