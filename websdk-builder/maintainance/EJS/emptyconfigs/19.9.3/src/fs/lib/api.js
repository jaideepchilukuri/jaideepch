import { _W } from "../util/quickrefs";
import { setFSRVisibility } from "../util/utils";

/**
 * Exposes API methods to the page
 * @type {{_enforceGlobalNS: API._enforceGlobalNS, expose: API.expose}}
 */
const API = {
  /**
   * Sets up the global namespace for API
   * @private
   */
  _enforceGlobalNS() {
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
  expose(name, obj) {
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
  retrieveFromAPI(name) {
    API._enforceGlobalNS();
    return _W.FSR[name];
  },
};

// dependency invert
const interceptions = [];
function addClearStateIntercept(cb) {
  interceptions.push(cb);
}

function interceptClearState(cb) {
  return () => {
    for (let i = 0; i < interceptions.length; i++) {
      interceptions[i]();
    }
    cb();
  };
}

// Expose setFSRVisibility across all products instead of individually.
API.expose("setFSRVisibility", setFSRVisibility);

export { API, addClearStateIntercept };
