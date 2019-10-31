// Some global quickreferences
var _W = window,
  _D = _W.document,
  supportsDomStorage = !!_W.sessionStorage,
  skipInit = false,
  _HD = _D.getElementsByTagName("head"),
  _moduleLocationOverride,
  isOpera = typeof opera !== 'undefined' && opera.toString() === '[object Opera]',
  gatewayVersion = 2.03;

if (isOpera) {
  return;
}

if (_HD && _HD.length > 0) {
  _HD = _HD[0];
} else {
  _HD = _D.body;
}

try {
  if (supportsDomStorage) {
    sessionStorage.setItem('_', '');
  }
} catch(e) {
  supportsDomStorage = false;
}