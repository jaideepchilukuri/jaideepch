/**
 * Web Beacon API wrapper.
 *
 * (c) Copyright 2018 ForeSee, Inc.
 *
 */

/**
 * Does an HTTP POST to the server with the JSON data without
 * waiting for a response from the server. Except on IE where
 * it does a synchronous HTTP request instead. This is safe to
 * call on browser unload, and that is the main usecase for it.
 *
 * @param {string} url the url to send to
 * @param {Object} data the data to send
 * @param {bool} isJSON send as json or form data
 */
function sendWithoutWaiting(url, data, isJSON) {
  var contentType = isJSON ? "application/json" : "application/x-www-form-urlencoded";
  if (typeof isJSON === "undefined") {
    isJSON = true;
  }

  if (typeof navigator.sendBeacon === "function") {
    try {
      // This request will be sent using a Content-Type of text/plain
      // because of an unresolved bug in chrome.
      var success = navigator.sendBeacon(
        url,
        // new Blob([
        //   isJSON ? JSON.stringify(data) : fs.toQueryString(data)
        // ], { type: contentType })
        isJSON ? JSON.stringify(data) : fs.toQueryString(data)
      );

      /* pragma:DEBUG_START */
      if (!success) {
        console.error("Failed to queue beacon data!");
      }
      /* pragma:DEBUG_END */
    } catch (e) {
      /* pragma:DEBUG_START */
      console.error(e);
      /* pragma:DEBUG_END */
    }
  } else {
    // IE, use synchronous ajax request instead
    new AjaxTransport().send({
      method: "POST",
      url: url,
      data: data,
      contentType: contentType,
      timeout: 10000,
      sync: true, // yes, do this on the main thread
    });
  }
}

// Expose it
utils.sendWithoutWaiting = sendWithoutWaiting;
