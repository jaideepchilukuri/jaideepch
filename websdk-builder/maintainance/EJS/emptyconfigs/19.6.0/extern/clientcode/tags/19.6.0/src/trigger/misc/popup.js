/**
 * A Popup util that tries to achieve pop-under when supported
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("trig.Misc.PopUp");

fs.require("trig.Top");

(function (trigger) {

  /**
   * Launch a popup
   * @param url
   * @param w
   * @param h
   */
  var popup = function (url, wname, args, brwsr, popunder) {
    var oargs = {
      width: 700,
      height: 350,
      left: 50,
      top: 50,
      resizable: 'no',
      scrollbar: '1',
      scrollbars: '1',
      toolbar: 'no',
      menubar: 'no',
      location: '0',
      directories: 'no',
      status: 'no'
    };

    var finalargs = fs.ext(oargs, args),
      fstr = '';
    for (var attr in finalargs) {
      fstr += attr + '=' + finalargs[attr] + ',';
    }

    var popupWindow = this._win = _W.open(url, wname, fstr);

    if (popupWindow && popunder) {
      popupWindow.blur();
      popupWindow.opener.window.focus();
      _W.focus();

      if (brwsr.browser.name == "Firefox") {
        var ghost = _W.open('about:blank');
        ghost.focus();
        ghost.close();
      } else if (brwsr.isIE) {
        setTimeout(function () {
          popupWindow.blur();
          popupWindow.opener.window.focus();
          _W.focus();
        }, 1000);
      }
    }

    return popupWindow;
  };

})(trigger);