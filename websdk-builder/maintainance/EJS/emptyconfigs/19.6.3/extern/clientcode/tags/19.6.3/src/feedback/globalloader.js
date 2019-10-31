fs.provide("fs.GlobalLoader");

fs.require("fs.Top");
fs.require("fs.Misc.SimpleTween");
fs.require("fs.ui.Badge");
fs.require("fs.Dom.MiniDOM");
fs.require("fs.Criteria");
fs.require("fs.TemplateGrabber");

(function () {

  /**
   * A global loader for feedback.
   * 1. Prefetch all the templates by calling TemplateGrabber Function.
   * 2. Keep track of all the templates and do NOT fire unnecessary requests.
   */
  var GlobalLoader = function (browser, cpps, templateTypes) {
    this.br = browser;
    this.cpps = cpps;
    this.templateHolder = {};
    this.loadSuccess = new utils.FSEvent();
    this.loadFailure = new utils.FSEvent();

    // Global Async Queue..
    var asyncQ = new utils.Async(true,
      fs.proxy(function () {
        /* pragma:DEBUG_START */
        console.warn("fb: Global init done.");
        /* pragma:DEBUG_END */
        this.loadSuccess.fire(this.templateHolder);
      }, this),
      fs.proxy(function () {
        /* pragma:DEBUG_START */
        console.warn('fb: Global init fail.');
        /* pragma:DEBUG_END */
        this.loadFailure.fire();
      }, this)
    );

    // Get the templates..
    for (var i = 0; i < templateTypes.length; i++) {
      /* jshint ignore:start */
      asyncQ.enqueue(fs.proxy(function (_template) {
        return function (prom) {
          var tg = new TemplateGrabber(this.br, this.cpps, _template);
          // Grab Templates..
          tg.grabTemplates(fs.proxy(function (tmp) {
            if (tmp) {
              this.templateHolder[_template] = tmp;
              prom.resolve();
            } else {
              prom.error();
            }
          }, this));
        };
      }(templateTypes[i]), this));
      /* jshint ignore:end */
    }
  };

})();