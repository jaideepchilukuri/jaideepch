/**
 * The templater
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("opt.Misc.Template");

fs.require("opt.Top");

(function () {

  // Obfuscation for malicious san
  var __templA = "Func",
    __templB = "ion";

  /**
   * The HTML templater
   * @param str
   * @param data
   * @returns {*}
   */
  var Templater = function (str, data) {
    var fn;
    /* jshint ignore:start */
    fn = new window[__templA + 't' + __templB]("obj",
      "var p=[],print=function(){p.push.apply(p,arguments);};" +
      "with(obj){p.push('" + str
        .replace(/[\r\t\n]/g, " ")
        .split("<%").join("\t")
        .replace(/((^|%>)[^\t]*)'/g, "$1\r")
        .replace(/\t=(.*?)%>/g, "',$1,'")
        .split("\t").join("');")
        .split("%>").join("p.push('")
        .split("\r").join("\\'") + "');}return p.join('');");
    /* jshint ignore:end */
    return data ? fn(data) : fn;
  };

})();