/**
 * Reads commands embedded in hashes in the URL. Returns true or false.
 * @param commandName
 * @returns Boolean
 */
const fsCmd = commandName => {
  const hv = `${location.hash}`.toLowerCase();
  commandName = (commandName || "").toLowerCase();
  if (/fscommand|fscmd|acscmd|acscommand/.test(hv) && hv.indexOf(commandName) > -1) {
    return true;
  }
  return false;
};

export { fsCmd };
