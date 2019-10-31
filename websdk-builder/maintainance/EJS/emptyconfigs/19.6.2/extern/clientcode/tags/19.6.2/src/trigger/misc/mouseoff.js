/**
 * Mouse off feature
 *
 * (c) Copyright 2018 ForeSee, Inc.
 *
 * @author Pablo Suarez (pablo.suarez@foresee.com)
 * @author Pablo Suarez pablo.suarez $
 *
 */

fs.provide("mo.mouseoff");

fs.require("trig.Top");

(function () {

  /**
   * Mouse movement watching that triggers an invite when the user's mouse leaves the window from the top
   * @param {Object} trigger 
   * @param {Object} surveydef 
   * @param {Object} browser 
   * @param {Object} gstg 
   * @param {Object} journey 
   * @constructor
   */
  var MouseOff = function (trigger, surveydef, browser, gstg, journey) {
    fs.ext(this, {
      browser: browser,
      gstg: gstg,
      journey: journey,
      trigger: trigger,
      surveydef: surveydef,
      mode: (surveydef.mouseoff.mode || 'off').toLowerCase(),
    }, false);
  };

  /**
   * Defines the mousemove and mouseleave Event Listeners to use, but doesn't add them yet
   */
  MouseOff.prototype.initialize = function () {
    var prevX = 0;
    var prevY = 0;
    var nw = utils.now();
    var prevTime = nw;
    var speed;
    var pageWidth;
    var slope;
    var x_intercept;
    var x_offset;
    var y_offset;
    var inviteStatus;

    /**
     * Helper function that calculates trajectory of a mouse move
     * @param {Integer} px - previous x
     * @param {Integer} py - previous y
     * @param {Integer} cx - current x
     * @param {Integer} cy - current y
     * @return {Boolean} whether the x-intercept is at the top of the page
     */
    var topOutTrajectory = function (px, py, cx, cy) {
      y_offset = window.pageYOffset;
      x_offset = window.pageXOffset;
      pagewidth = window.innerWidth;
      slope = (cy - py) / (cx - px);
      x_intercept = (y_offset - (cy - (slope * cx))) / slope - x_offset;

      // If x_intercept is NaN, it is because it is slope is -Infinity (vertical), use current x instead
      if (isNaN(x_intercept)) {
        x_intercept = cx;
      }

      // ES6 debugging
      // console.table({ px, py, cx, cy, speed, x_intercept, slope, pagewidth });
      // console.log('mouseoff: table', { px: px, py: py, cx: cx, cy: cy, speed: speed, x_intercept: x_intercept, slope: slope, pagewidth: pagewidth });

      return cy < py &&
        (x_intercept >= 0 && x_intercept <= pagewidth);
    };

    /**
     * mousemove handler needed to calculate values for:
     * speed, previous x, previous y 
     */
    this.mousemoveHandler = function (e) {
      nw = utils.now();

      // Throttle mousemove to ensure we get different previous x/y values in mouseleave in IE 11
      if (nw - prevTime > 100) {
        speed = Math.sqrt(
          Math.pow(e.pageX - prevX, 2) +
          Math.pow(e.pageY - prevY, 2)
        ) / (nw - prevTime);
        prevX = e.pageX;
        prevY = e.pageY;
        prevTime = nw;
      }
    }.bind(this);

    /**
     * mouseleave handler 
     */
    this.mouseleaveHandler = function (e) {
      if (document.hasFocus() && topOutTrajectory(prevX, prevY, e.pageX, e.pageY)) {
        /* pragma:DEBUG_START */
        console.warn("mouseoff: mouseleave at top occurred");
        /* pragma:DEBUG_END */

        // Stop the Event Listener if our MouseOff conditions are met
        this.dispose();

        // Check Storage again in case an invite occurred in between last updateinterval
        this.gstg._sync(function () {
          if (!this.gstg.get('i')) {

            // Logging
            this.trigger.cpps.set('mouseoff', true);
            this.journey.addEventsDefault('properties', {
              'fs_inviteType': ['mouseoff']
            });

            this.journey.addEventObj({
              'name': 'fs_mouseoff',
              'metrics': {
                'fs_mouseoff_speed': speed,
                'fs_mouseoff_slope': Math.max(slope, -9999),
                'fs_mouseoff_pagewidth': pagewidth,
                'fs_mouseoff_xintercept': x_intercept,
                'fs_mouseoff_xpercentage': x_intercept / pagewidth,
                'fs_mouseoff_pagenumber': this.gstg.get('pv')
              }
            });

            // Run the success callback (present the invite)
            if (this.successFn) {
              this.successFn();
            }
          }
        }.bind(this));
      }
    }.bind(this);
  };

  /**
   * Returns true if lf/sp from the survey def are met
   */
  MouseOff.prototype.checkCriteria = function () {
    if (!this.mode || this.mode === 'off') {
      /* pragma:DEBUG_START */
      console.warn("mouseoff: feature is not enabled in survey def");
      /* pragma:DEBUG_END */
      return;
    }
    var def = this.surveydef;
    var pool = this.gstg.get('pl');
    var pv = this.gstg.get('pv');
    var sp = def.mouseoff.sp || def.criteria.sp;
    var lf = def.mouseoff.lf || def.criteria.lf;
    var rnum = (Math.random() * 100);

    sp = (!fs.isDefined(pool) || pool == 1) ? (sp.reg || 0) : (sp.outreplaypool || 0);
    if (pv >= lf && rnum <= sp) {
      /* pragma:DEBUG_START */
      console.warn("mouseoff: Met mouseoff loyalty");
      /* pragma:DEBUG_END */

      return true;
    }
    /* pragma:DEBUG_START */
    console.warn("mouseoff: did not meet mouseoff loyalty");
    /* pragma:DEBUG_END */

    return false;
  };

  /**
   * Chooses which mode to use for MouseOff listening (lasttab or multitab)
   * @param {Function} start - the function to run when the event Listeners are added
   * @param {Function} success - the function to run when the MouseOff conditions are met (present the invite)
   */
  MouseOff.prototype.startListening = function (start, success) {
    this.startFn = start;
    this.successFn = success;
    if (this.mode === 'multitab') {
      this.startListeningMultiTab();
    }
  };

  /**
   * Sets a timeout based on the survey def tabtime/totaltime numbers
   * The timeout does the following:
   * 1. Adds the mousemove and mouseleave Event Listeners
   * 2. Calls the Invite Setup to preload the invite assets
   */
  MouseOff.prototype.startListeningMultiTab = function () {
    var minPage = this.surveydef.mouseoff.minPageTime || 0;
    var minSite = this.surveydef.mouseoff.minSiteTime || 0;
    var totalTimeLeft = this.gstg.get('sst') + minSite - utils.now();
    var delay;

    /* pragma:DEBUG_START */
    console.warn('mouseoff: Timeouts -- minPageTime:', minPage, ', minSiteTime:', minSite, ', siteTimeLeft:', totalTimeLeft);
    /* pragma:DEBUG_END */

    // Start the event listening on a delay, the larger of minPageTime and minSiteTime
    delay = Math.max(minPage, totalTimeLeft);
    this.timeout = setTimeout(function () {
      /* pragma:DEBUG_START */
      console.warn('mouseoff: Mouse Event Listening is starting');
      /* pragma:DEBUG_END */

      // Run the start function (load the invite assets)
      this.startFn();
      utils.Bind(document.documentElement, 'mouseoff:mousemove', this.mousemoveHandler, true);
      utils.Bind(document.documentElement, 'mouseoff:mouseleave', this.mouseleaveHandler, true);

      // Stop the mouseoff watching if the invite appears somewhere (some other tab)
      this.gstg.setUpdateInterval(10 * 1000);
      this.gstg.watchForChanges(['i'], function (key, olddata, newdata) {
        // Restore the 60s interval
        this.gstg.setUpdateInterval(60 * 1000);

        /* pragma:DEBUG_START */
        console.warn('mouseoff: the invite appeared somewhere, disposing mouseoff');
        /* pragma:DEBUG_END */
        this.dispose();

      }.bind(this), true, true);
    }.bind(this), delay);
  };

  /**
   * Removes the Event Listeners, clear timeouts/intervals
   */
  MouseOff.prototype.dispose = function () {
    utils.Unbind('mouseoff:*');
    clearTimeout(this.timeout);
  };

})();
