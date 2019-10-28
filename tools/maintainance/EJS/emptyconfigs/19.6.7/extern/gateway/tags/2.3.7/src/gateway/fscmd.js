/**
 * Reads commands embedded in hashes in the URL. Returns true or false.
 * @param commandName
 * @returns Boolean
 */
var fsCmd = function (commandName) {
  var hv = (location.hash + '').toLowerCase();
  commandName = (commandName || '').toLowerCase();
  if (/fscommand|fscmd|acscmd|acscommand/.test(hv) && hv.indexOf(commandName) > -1) {
    return true;
  }
  return false;
},
  acsCmd = fsCmd;

// To prevent compression
fsCmd('');
acsCmd('');