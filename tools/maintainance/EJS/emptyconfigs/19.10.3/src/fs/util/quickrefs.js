// Some global quickreferences
const _W = window;
const _D = _W.document;
let supportsDomStorage = !!_W.sessionStorage;
let _HD = _D.getElementsByTagName("head");
let _moduleLocationOverride;
const gatewayVersion = 2.03;

if (_HD && _HD.length > 0) {
  _HD = _HD[0];
} else {
  _HD = _D.body;
}

try {
  if (supportsDomStorage) {
    sessionStorage.setItem("_", "");
    sessionStorage.removeItem("_");
  }
} catch (e) {
  supportsDomStorage = false;
}

export { _W, _D, supportsDomStorage, _HD, _moduleLocationOverride, gatewayVersion };
