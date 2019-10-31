/*jshint -W030 */
/**
 * DomReady implementation. Compatible with:
 * IE6+
 * Firefox 2+
 * Safari 3+
 * Chrome *
 * Opera *
 * Based on domready 0.3.0 (c) Dustin Diaz 2012 - License MIT
 * https://github.com/ded/domready/tree/v0.3.0
 * Minor changes for hinting and brevity were made.
 */
var domReady = (function(ready) {
  var fns = [],
    fn,
    f = false,
    doc = document,
    testEl = doc.documentElement,
    hack = testEl.doScroll,
    domContentLoaded = "DOMContentLoaded",
    addEventListener = "addEventListener",
    onreadystatechange = "onreadystatechange",
    readyState = "readyState",
    loadedRgx = hack ? /^loaded|^c/ : /^loaded|c/,
    loaded = loadedRgx.test(doc[readyState]);

  function flush(f) {
    loaded = 1;
    do {
      f = fns.shift();
      if (f) {
        f();
      }
    } while (f);
  }

  doc[addEventListener] &&
    doc[addEventListener](
      domContentLoaded,
      (fn = function() {
        doc.removeEventListener(domContentLoaded, fn, f);
        flush();
      }),
      f
    );

  hack &&
    doc.attachEvent(
      onreadystatechange,
      (fn = function() {
        if (/^c/.test(doc[readyState])) {
          doc.detachEvent(onreadystatechange, fn);
          flush();
        }
      })
    );

  return (ready = hack
    ? function(fn) {
        self != top
          ? loaded
            ? fn()
            : fns.push(fn)
          : (function() {
              try {
                testEl.doScroll("left");
              } catch (e) {
                return setTimeout(function() {
                  ready(fn);
                }, 50);
              }
              fn();
            })();
      }
    : function(fn) {
        loaded ? fn() : fns.push(fn);
      });
})();
