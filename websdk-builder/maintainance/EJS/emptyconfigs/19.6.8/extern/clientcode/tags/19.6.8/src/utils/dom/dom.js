/**
 * DOM stuff
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.Utils.Dom.Dom");

fs.require("fs.Top");

(function (utils) {

  /**
   * Adds a class to a list of elements.
   * @param element_list {array,string} An array of html element nodes to apply the masking to
   * @param value {value} The name of the CSS class to add to the elements
   * @return {*}
   */
  utils.addClass = function (elements, value) {
    var i,
      l,
      elem,
      curr_class_name;

    if (!fs.isDefined(elements.length)) {
      elements = [elements];
    }

    for (i = 0, l = elements.length; i < l; i++) {
      // Quickreference this element
      elem = elements[i];
      if (utils.isElement(elem)) {
        // Add this class name only if it is an element and it doesn't exist already
        curr_class_name = elem.className || "";
        if (!(new RegExp("\\b" + value + "\\b")).test(curr_class_name)) {
          elem.className = (curr_class_name === "" ? "" : curr_class_name + " ") + value;
        }
      }
    }
  };

  /**
   * Removes a class from a list of elements
   * @param element_list
   * @param value
   */
  utils.removeClass = function (elements, value) {
    var i,
      l,
      elem;

    if (!fs.isDefined(elements.length)) {
      elements = [elements];
    }

    for (i = 0, l = elements.length; i < l; i++) {
      // Quickreference this element
      elem = elements[i];

      // Replace the className with an empty string
      if (utils.isElement(elem) && elem.className) {
        elem.className = elem.className.replace(new RegExp('(\\s|^)' + value + '(\\s|$)'), ' ').replace(/^\s+|\s+$/g, '');
      }
    }
  };
  /**
   * Does an element have a particular class on it?
   * @param el
   * @param cname
   * @returns {boolean}
   */
  utils.hasClass = function (el, cname) {
    return (utils.isElement(el) && el.classList && el.classList.contains(cname));
  };
  /**
   * Set css attributes of an element
   * @param elm {HtmlElement}
   * @param opts {Object}
   */
  utils.css = function (elm, opts, forceStyle) {
    if (elm) {
      if (!fs.isDefined(elm.length))
        elm = [elm];
      for (var i = 0; i < elm.length; i++)
        for (var prop in opts) {
          if (!prop)
            continue;
          if ("zIndex".indexOf(prop) == -1 && (typeof (opts[prop]) == "number" && prop != "opacity"))
            opts[prop] += "px";
          if (forceStyle) {
            elm[i].style.cssText += ';' + prop + ':' + opts[prop] + ' !important';
          } else {
            elm[i].style[prop] = opts[prop];
          }

        }
    }
    return elm;
  };


  /**
   * Set HTML attributes of an element
   * @param elm {HtmlElement}
   * @param opts {Object}
   */
  utils.attr = function (elm, opts) {
    if (elm) {
      if (!fs.isDefined(elm.length)) {
        elm = [elm];
      }
      for (var i = 0; i < elm.length; i++)
        for (var prop in opts) {
          elm[i].setAttribute(prop, opts[prop]);
        }
    }
    return elm;
  };

  /**
   * Prevent user from focussing on anything outside of this element
   * @param elem {HTMLElement}
   */
  utils.restrictFocus = function (elem) {
    // Get a list of all the elements that we're restricting focus to sorted by tab index
    var elements_to_focus_on = document.querySelectorAll("a, input[type=text], textarea, button, input[type=radio], select, *[tabIndex]", elem).sort(function (e1, e2) {

      // Anything with a tab index of 0 is pushed to the end
      return parseInt(e1.tabIndex) > parseInt(e2.tabIndex);
    });

    var keydownClbk = function (elements_to_focus_on) {
      return function (e) {
        var i,
          j;
        // Is this a tab keypress?
        if (e.keyCode === 9) {

          // Find this element in the list
          for (i = 0; i < elements_to_focus_on.length; i++) {

            if (elements_to_focus_on[i] === e.target) {
              if (e.preventDefault) {
                e.preventDefault();
              } else {
                e.returnValue = false;
              }

              j = i;

              // If shift+tab, find the previous visible, tab-indexed element
              if (e.shiftKey) {
                do {
                  j = (j === 0) ? (elements_to_focus_on.length - 1) : (j - 1);
                } while ((elements_to_focus_on[j].offsetLeft <= 0 || elements_to_focus_on[j].tabIndex < 0) && j != i);

                // If tab, find the next visible, tab-indexed element
              } else {
                do {
                  j = (j + 1) % elements_to_focus_on.length;
                } while ((elements_to_focus_on[j].offsetLeft <= 0 || elements_to_focus_on[j].tabIndex < 0) && j != i);
              }

              // Focus on this element
              elements_to_focus_on[j].focus();
              break;
            }
          }
        }
      };
    };

    // Override the tab and shift+tab behaviour for all the tabbed elements in the dialog
    for (var i = 0; i < elements_to_focus_on.length; i++) {
      var element = elements_to_focus_on[i];

      // Unbind any previous bindings
      utils.Unbind(element, "keydown");

      // Bind to the keydown event to capture tab keypresses
      utils.Bind(element, "keydown", keydownClbk(elements_to_focus_on));
    }
  };

  /**
   *
   * @param replacement {string|HTMLElement} The replacement HTML string or element
   */
  utils.hideAll = function (replacement) {
    var allElements = document.body.querySelectorAll("*"),
      i;
    for (i = 0; i < allElements.length; i++) {
      utils.css(allElements[i], { display: 'none' });
    }
  };

  /**
   * Get the index of an element within an element
   */
  utils.elindex = function (elm) {
    var nodes = elm.parentNode.childNodes,
      node,
      i = 0,
      count = 0;
    while ((node = nodes.item(i++)) && node != elm) {
      if (node.nodeType == 1) {
        count++;
      }
    }
    return count;
  };

  /**
   * To know whether an element is a valid html element or not.
   */
  utils.isElement = function (ele) {
    return (ele && ele.nodeType && (ele.nodeType == 1 || ele.nodeType == 11 || ele.nodeType == 9));
  };

  /**
   * retrieve a string as the rbowser would render it, decoding HTML entities
   * like &amp; &eacute; etc.
   * from https://stackoverflow.com/a/34064434/1263612
   */
  utils.decodeHTMLEntities = function (str) {
    // https://developer.mozilla.org/en-US/docs/Web/API/DOMParser
    var doc = new DOMParser().parseFromString(str, "text/html");
    return doc.documentElement.textContent;
  };
})(utils);