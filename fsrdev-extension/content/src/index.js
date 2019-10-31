/* global chrome */
import { Store } from "react-chrome-redux";
import methodToInject from "./methodToInject";

const proxyStore = new Store({ portName: "FSRDevExtension" });
let configFSR; //container for config data loaded from resource script
let guidID; //container for config data loaded from resource script

const injectScript = (file, node) => {
  let th = document.getElementsByTagName(node)[0];
  let s = document.createElement("script");
  s.setAttribute("type", "text/javascript");
  s.setAttribute("src", file);
  th.appendChild(s);
};

const scriptToInject = function (methodCalledinParent) {
  const actualCode = "(" + function (func) {
    func();
  } + ")(" + methodCalledinParent + ");";
  var script = document.createElement("script");
  script.textContent = actualCode;
  (document.head || document.documentElement).appendChild(script);
  script.remove();
};

proxyStore.ready().then(() => {
  let settings = proxyStore.getState().settings;
  let windowURL = window.location.href;
  let urlsToTest = ["fs.tracker", "fs.feedbacksurvey.html", "survey.foreseeresults", "cx.foresee.com/sv", "cxsurvey.foresee.com/sv"];

  let includeCurrentWindow = !urlsToTest.some((urlToCheck) => {
    return windowURL.indexOf(urlToCheck) > -1;
  });

  if (settings.injection && includeCurrentWindow) {
    (function (g) {
      let d = document, am = d.createElement("script"), h = d.head || d.getElementsByTagName("head")[0], fsr = "fsReady",
        aex = {
          "src": `//gateway.foresee.com/sites/${settings.injectionKey}/${settings.injectionConfig}/gateway.min.js?FSRDevExtension=Injector`,
          "type": "text/javascript",
          "async": "true",
          "data-vendor": "fs",
          "data-role": "gateway"
        };
      for (let attr in aex) { am.setAttribute(attr, aex[attr]); } h.appendChild(am); g[fsr] = function () { let aT = "__" + fsr + "_stk__"; g[aT] = g[aT] || []; g[aT].push(arguments); };
    })(window);
  }
});

// Inject script with access to window ENV where content script is executed.
// This is the only script with access to the native ENV variables
injectScript(chrome.extension.getURL("/resource.js"), "body");

// Resource Script message listener recieves FSR config on readyFunction()
window.addEventListener("message", (event) => {
  if (event.source !== window || !event.data.type) {
    return;
  }

  if (event.data.type === "FSR_CONFIG_RESPONSE") {

    configFSR = event.data.payload;
  } else if (event.data.type === "GUID_SID_RESPONSE") {

    guidID = event.data.payload;
  }
}, false);

// Popup listener provides config to components
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  if (request.type === "GET_FSR_CONFIG") {

    if (!configFSR) {
      window.postMessage({ "type": "FSR_CONFIG_REQUEST" }, "*");
    }

    sendResponse({ "config": configFSR });
  } else if (request.type === "GET_GUID_SID") {

    if (!guidID) {
      window.postMessage({ "type": "GUID_SID_REQUEST" }, "*");
    }

    sendResponse({ "guidID": guidID });
  } else if (methodToInject[request.type]) {

    console.log("About to fire method: ", request.type);
    scriptToInject(methodToInject[request.type].func);
  }
});
