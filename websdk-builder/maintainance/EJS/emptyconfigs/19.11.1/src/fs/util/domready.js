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
const domReady = (ready => {
  const fns = [];
  let fn;
  const f = false;
  const doc = document;
  const testEl = doc.documentElement;
  const hack = testEl.doScroll;
  const domContentLoaded = "DOMContentLoaded";
  const addEventListener = "addEventListener";
  const onreadystatechange = "onreadystatechange";
  const readyState = "readyState";
  const loadedRgx = hack ? /^loaded|^c/ : /^loaded|c/;
  let loaded = loadedRgx.test(doc[readyState]);

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
      (fn = () => {
        doc.removeEventListener(domContentLoaded, fn, f);
        flush();
      }),
      f
    );

  hack &&
    doc.attachEvent(
      onreadystatechange,
      (fn = () => {
        if (/^c/.test(doc[readyState])) {
          doc.detachEvent(onreadystatechange, fn);
          flush();
        }
      })
    );

  return (ready = hack
    ? fn => {
        self != top
          ? loaded
            ? fn()
            : fns.push(fn)
          : (() => {
              try {
                testEl.doScroll("left");
              } catch (e) {
                return setTimeout(() => {
                  ready(fn);
                }, 50);
              }
              fn();
            })();
      }
    : fn => {
        loaded ? fn() : fns.push(fn);
      });
})();

export { domReady };
