/**
 * Exposes API methods to the page
 * @type {{_enforceGlobalNS: API._enforceGlobalNS, expose: API.expose}}
 */
var API = {
  /**
   * Sets up the global namespace for API
   * @private
   */
  _enforceGlobalNS: function() {
    if (!_W.FSR) {
      _W.FSR = {};
    }
    if (!_W.FSFB) {
      _W.FSFB = {};
    }
  },
  /**
   * Expose a function or property onto the API
   * @param name
   * @param obj
   */
  expose: function(name, obj) {
    API._enforceGlobalNS();

    // We can't add this functionality to trigger/feedback as they
    // shouldn't have knowledge of QA mode, so we add it here by
    // intercepting the definition of clearState and clearStateFeedback
    if (name === "clearState" || name === "clearStateFeedback") {
      obj = interceptClearState(obj);
    }

    _W.FSR[name] = _W.FSFB[name] = obj;
  },

  /**
   * Get an API item
   * @param name
   * @returns {*}
   */
  retrieveFromAPI: function(name) {
    API._enforceGlobalNS();
    return _W.FSR[name];
  },
};

function interceptClearState(cb) {
  return function() {
    clearQAModeConfigs();
    cb();
  };
}

// Expose setFSRVisibility across all products instead of individually.
API.expose("setFSRVisibility", setFSRVisibility);
