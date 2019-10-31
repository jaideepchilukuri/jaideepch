//Store Dependencies
import rootReducer from "./reducers/root";
import {createStore} from "redux";
import {wrapStore} from "react-chrome-redux";

//Actions
import SDKRedirector from "./lib/sdk-redirector";
import SDKSuppressor from "./lib/sdk-suppressor";
import ConfigRedirector from "./lib/config-redirector";

// The Event script maintains the true Redux store.  All other areas of the application
// (content, popup, and resource scripts) access the store through a proxt provided by react-chrome-redux package.
// actions, constants and reducers should be defined in event/src/... but will be accessible on the proxy stores
// using the same API as a traditional redux store

const store = createStore(rootReducer, {});
window.store = store;
wrapStore(store, {
  portName: "FSRDevExtension"
});

let currentSettings = store.getState().settings;

const listeners = [
  new SDKRedirector(currentSettings),
  new SDKSuppressor(currentSettings),
  new ConfigRedirector(currentSettings)
];

const bindListeners = () => {
  let previousSettings = currentSettings;
  currentSettings = store.getState().settings;

  listeners.forEach((listener) =>{
    if(listener.constructor.redirectorShouldUpdate(previousSettings,currentSettings)){
      listener._updateRedirectionSettings(currentSettings);
      listener._addRequestListener();
    }
  });
};

//Subscribe listeners to state change in Redux store.settings
store.subscribe(bindListeners);
