/**
 * OptOut class
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("opt.OptOut");

fs.require("opt.Top");
fs.require("opt.Misc.Template");

(function () {

  /**
   * The opt out class
   * @param browser
   * @constructor
   */
  var OptOut = function (browser) {
    this.browser = browser;
    this.stg = utils.getGeneralStorage(browser);
  };

  /**
   * Retrieve the template and stylesheet
   * @param cb (Function) callback on complete
   */
  OptOut.prototype.loadResources = function (cb) {
    this.stg.ready.subscribe(fs.proxy(function () {
      var csslocation = fs.makeURI("$templates/trigger/admintools/main.css"),
        templatelocation = fs.makeURI("$templates/trigger/admintools/optout.html"),
        gotcss = false,
        gottemplate = false,
        check = function () {
          if (gotcss && gottemplate && cb) {
            cb();
          }
        };

      // Grab the CSS
      utils.loadCSS(csslocation, function (linkel) {
        /* pragma:DEBUG_START */
        console.warn("optout: got css");
        /* pragma:DEBUG_END */
        gotcss = true;
        check();
      }, null, this.browser);

      // Grab the template
      var tr = new utils.JSONP({
        success: fs.proxy(function (result) {
          /* pragma:DEBUG_START */
          console.warn("optout: got template");
          /* pragma:DEBUG_END */
          gottemplate = true;
          this.template = result;
          check();
        }, this)
      });
      tr.get(templatelocation, 'templates_trigger_admintools_');
    }, this), true, true);
  };

  /**
   * Apply the current opt-out / opt-in state to the UI
   * @private
   */
  OptOut.prototype._applyOptOutState = function () {
    this.stg.ready.subscribe(fs.proxy(function (data) {
      var d = document,
        optout = this.stg.get('optout');
      if (!fs.isDefined(optout) || optout == 'false') {
        d.querySelector('.acsOptOutControls').style.display = 'block';
        d.querySelector('.acsOptInControls').style.display = 'none';
      } else {
        d.querySelector('.acsOptOutControls').style.display = 'none';
        d.querySelector('.acsOptInControls').style.display = 'block';
        var expdate = new Date(),
          monthNames = [
            "January", "February", "March",
            "April", "May", "June", "July",
            "August", "September", "October",
            "November", "December"
          ];
        // TODO test this
        expdate.setTime(data._data.keys.optout.x);

        var day = expdate.getDate(),
          monthIndex = expdate.getMonth(),
          year = expdate.getFullYear();
        d.getElementById('acswhenexpires').innerHTML = monthNames[monthIndex] + ' ' + day + ', ' + year;
      }
    }, this), true, true);
  };

  /**
   * Draw everything
   */
  OptOut.prototype.render = function () {
    document.title = "ForeSee Opt-Out Tool";
    var vrs = fs.ext(this.browser, {
      siteLogo: fs.config.staticUrl + '/logos/foresee/foresee.svg'
    });
    var outstr = Templater(this.template, vrs),
      oneyear = (1000 * 60 * 60 * 24 * 365);
    document.body.innerHTML = outstr;
    var oob = document.getElementById('acsOptOutButton'),
      oib = document.getElementById('acsOptInButton');
    utils.Bind(oob, "click", fs.proxy(function (e) {
      utils.preventDefault(e);
      this.stg.set('optout', true, 1000 * 60 * 60 * 24 * 365, true);
      this._applyOptOutState();
    }, this));
    utils.Bind(oib, "click", fs.proxy(function (e) {
      utils.preventDefault(e);
      this.stg.erase('optout', null, true);
      this._applyOptOutState();
    }, this));
    this._applyOptOutState();
  };

})();