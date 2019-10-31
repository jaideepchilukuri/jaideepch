/**
 * Storage class.
 * @constructor
 */
var stg = function() {
};

/**
 * Does an item exist
 * @param itm
 */
stg.prototype.has = function(itm) {
  return this.get(itm) !== null;
};

/**
 * Get a value (null if not there)
 * @param itm
 */
stg.prototype.get = function (itm) {
  var res = null;
  if (supportsDomStorage) {
    res = localStorage.getItem(itm);
    if (!res) {
      res = sessionStorage.getItem(itm);
    }
  }
  return res;
};

/**
 * Set a value
 * @param itm
 * @param val
 */
stg.prototype.set = function(itm, val) {
  if (supportsDomStorage) {
    try {
      localStorage.setItem(itm, val.toString());
    } catch(e) {
      try {
        sessionStorage.setItem(itm, val.toString());
      } catch (e) {

      }
    }
  }
};