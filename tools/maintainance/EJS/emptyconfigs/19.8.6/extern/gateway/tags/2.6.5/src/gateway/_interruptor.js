/**
 * Don't allow multiple copies of gateway to be added to the page.
 * Also exit if the browser is too old (no JSON object)
 */
if (typeof _W["_fsDefine"] != "undefined" || !JSON || document.documentMode < 10) {
  return;
}
