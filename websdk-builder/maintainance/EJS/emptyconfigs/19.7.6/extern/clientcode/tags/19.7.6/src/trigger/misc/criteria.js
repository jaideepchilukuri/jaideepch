/**
 * Checks whether we are in or out of the pool
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("trig.Misc.Criteria");

fs.require("trig.Top");

(function (trigger) {

  /**
   * Runs criteria checking and pooling
   * @constructor
   */
  var Criteria = function (gstorage, config) {
    this.stg = gstorage;
    this.cfg = config;
  };

  /**
   * Check if we are in the cxReplay pool
   * @param callback
   */
  Criteria.prototype.calcReplayPoolStatus = function (callback) {
    var cfg = this.cfg.config,
      pls = cfg.replay_pools,
      pth = _W.location.toString(),
      i,
      pool,
      rg,
      rps,
      rgx;
    if (!pls || pls.length === 0 || this.pooloverride === true) {
      /* pragma:DEBUG_START */
      if (this.pooloverride) {
        console.warn("trigger: the pool is overridden");
      }
      /* pragma:DEBUG_END */
      callback(true);
    } else {
      pool = this.stg.get('pl');
      if (!fs.isDefined(pool)) {
        // Was not defined. Roll the dice
        for (i = 0; i < pls.length; i++) {
          if (utils.testAgainstSearch(pls[i].path, pth)) {
            // it matches
            if ((Math.random() * 100) < pls[i].sp) {
              pool = 1;
            } else {
              pool = 0;
            }
            // Set the pooling value but have it expire after 4 hours
            this.stg.set('pl', pool, 1000 * 60 * 60 * 4);
          }
        }
      }
      rps = cfg.replay_repools;
      // Check on repools
      if (pool === 0 && rps && rps.length > 0) {
        /* pragma:DEBUG_START */
        console.warn("trigger: we're pooled out, so checking on repools", rps);
        /* pragma:DEBUG_END */
        for (i = 0; i < rps.length; i++) {
          if (utils.testAgainstSearch(rps[i].path, pth)) {
            // it matches
            if ((Math.random() * 100) < rps[i].sp) {
              // We are in the pool
              pool = 1;
              /* pragma:DEBUG_START */
              console.warn("trigger: dice roll successful. back in the pool!");
              /* pragma:DEBUG_END */
            } else {
              // We are out of the pool
              pool = 0;
              /* pragma:DEBUG_START */
              console.warn("trigger: nope, still out of the pool");
              /* pragma:DEBUG_END */
            }
            // Set it again but have it expire after 4 hours
            this.stg.set('pl', pool, 1000 * 60 * 60 * 4);
          }
        }
      }
      callback(!!pool);
    }
  };

  /**
   * Check opt out
   */
  Criteria.prototype.optoutCheck = function (success, failure) {
    this.stg.ready.subscribe(function () {
      if (this.stg.get('optout') === true) {
        failure();
      } else {
        success();
      }
    }.bind(this), true, true);
  };

  /**
   * Check browser supported. Note: we basically ignore this if we're on mobile and rely on the platform check instead.
   */
  Criteria.prototype.browserCheck = function (brws, cfg) {
    // Return false if it's on the unsupported list and the version is too old
    if (!brws.isMobile && cfg.config.browser_cutoff[brws.browser.name] && brws.browser.actualVersion < cfg.config.browser_cutoff[brws.browser.name]) {
      return false;
    }
    return true;
  };

  /**
   * Check browser features
   * @param brws
   * @param cfg
   */
  Criteria.prototype.featureCheck = function (brws, cfg) {
    if (cfg.config.persistence == utils.storageTypes.DS && !brws.supportsLocalStorage) {
      return false;
    }
    return true;
  };

  /**
   * Check platform supported
   */
  Criteria.prototype.platformCheck = function (brws, cfg) {
    if (cfg.config.platform_cutoff[brws.os.name] && brws.os.version < cfg.config.platform_cutoff[brws.os.name]) {
      return false;
    }
    return true;
  };

  /**
   * Check device blacklist
   */
  Criteria.prototype.checkDeviceBlacklist = function (brws, cfg) {
    for (var i = 0; i < cfg.config.device_blacklist.length; i++) {
      if (fs.toLowerCase(brws.agent).indexOf(fs.toLowerCase(cfg.config.device_blacklist[i])) > -1) {
        return false;
      }
    }
    return true;
  };

  /**
   * Tests each of the urls, referrers, and userAgents defined in the
   * survey definition against its given browser counterpart.  If one matches, it
   * will return true.
   * @param def {Object} The survey definition to process against
   * @param brwsr {Browser} The browser object.
   * @param exAttr {String} The name of the exclude variable to look for.
   * @return {Boolean}
   */
  Criteria.prototype._match = function (def, brwsr, exAttr) {
    var include = def.include,
      exclude = def[(exAttr || 'globalExclude')];

    if (def.criteria) {
      // First turn off things if we don't support mobile or desktop
      if (!def.criteria.supportsSmartPhones && (!brwsr.isTablet && brwsr.isMobile)) {
        return false;
      } else if (!def.criteria.supportsTablets && brwsr.isTablet) {
        return false;
      } else if (!def.criteria.supportsDesktop && !brwsr.isMobile) {
        return false;
      }
    }

    // Do excludes
    if (exclude) {
      var doexclude = this.runAllTests(exclude, brwsr, false, true);
      if (doexclude) {
        return false;
      }
    }

    // Do includes
    if (include) {
      return this.runAllTests(include, brwsr, false, true);
    }

    // If we got to this point, then there really wasn't any criteria to check on,
    // so you might as well proceed
    return true;
  };

  Criteria.prototype.runAllTests = function (testlist, brwsr, bombonfalse, bombontrue) {
    var ck = new utils.Cookie({});

    // Quickreference the href
    var href = _W.location.href.toString(),
      refr = document.referrer.toString(),
      comparelist = {
        'urls': href,
        'referrers': refr,
        'userAgents': _W.navigator.userAgent
      };

    // Actually run a regex match
    function _match(m, v) {
      if (!Array.isArray(v)) {
        v = [v];
      }
      for (var x = 0, y = v.length; x < y; x++) {
        if (typeof v[x] === 'string') {
          v[x] = v[x].replace(/-_DS_-/gi, '$$');
        }
        if (utils.testAgainstSearch(v[x], m)) {
          return true;
        }
      }
      return false;
    }

    var truthyres;
    for (var tst in testlist) {
      var atest = testlist[tst];
      if (atest.length > 0) {
        truthyres = false;
        if (comparelist[tst]) {
          // It's one of the easy tests
          truthyres = _match(comparelist[tst], atest);
        } else {
          if (tst == 'browsers') {
            var brn = brwsr.browser.name,
              brv = brwsr.browser.actualVersion;
            for (var lp = 0; lp < atest.length; lp++) {
              if (fs.toLowerCase(brn).indexOf(fs.toLowerCase(atest[lp].name)) > -1) {
                if (!atest[lp].comparison) {
                  // No comparison provided
                  truthyres = true;
                } else if (atest[lp].comparison == 'lt' && brv < atest[lp].version) {
                  truthyres = true;
                } else if (atest[lp].comparison == 'eq' && brv == atest[lp].version) {
                  truthyres = true;
                } else if (atest[lp].comparison == 'gt' && brv > atest[lp].version) {
                  truthyres = true;
                }
              }
            }
          } else if (tst == 'cookies') {
            for (var ckd = 0; ckd < atest.length; ckd++) {
              var cki = atest[ckd],
                rck = ck.get(cki.name);
              if (fs.isDefined(cki.value) && rck == cki.value) {
                truthyres = true;
              } else if (!fs.isDefined(cki.value) && !!rck) {
                truthyres = true;
              }
            }
          } else if (tst == 'variables') {
            for (var ckdd = 0; ckdd < atest.length; ckdd++) {

              // CC-3975 backing up [].constructor.constructor. AT&T mootools is overriding it
              var constructorBackup = [].constructor.constructor;
              delete [].constructor.constructor;

              var ckiv = atest[ckdd],
                f = new [].constructor.constructor(
                  "var v1 = '';" +
                  "try { v1 = " + ckiv.name + ";}" +
                  "catch(err) {}" +
                  "return v1;"
                ),
                rckv = f.call(_W),
                containsCkivValue;

              [].constructor.constructor = constructorBackup;

              if (!rckv) {
                rckv = (typeof rckv === "boolean") ? false : "";
              }

              containsCkivValue = fs.isDefined(ckiv.value);

              // Checks for a boolean match or a regex string match
              if (containsCkivValue && (rckv === ckiv.value)) {
                truthyres = true;
              } else if (containsCkivValue && utils.testAgainstSearch(ckiv.value, rckv)) {
                truthyres = true;
              } else if (!containsCkivValue && !!rckv) {
                truthyres = true;
              }
            }
          }
        }

        // Spit out the result if necessary
        if (!truthyres && bombonfalse) {
          return true;
        } else if (truthyres && bombontrue) {
          return true;
        }
      }
    }
    return false;
  };

})(trigger);
