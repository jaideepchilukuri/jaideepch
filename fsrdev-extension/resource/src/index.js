/* global FSR */
// Extensions do not share an ENV with native scripts of the browser window. To
// access the window runtime of the website visited this script is injected on
// pageload to provide a messaging interface allowing retrieval of window.FSR
// values.

window.addEventListener("message", event => {
  let eventDataType;

  if (event.source !== window) {
    return;
  }

  eventDataType = event.data.type;
  if (eventDataType === "FSR_CONFIG_REQUEST") {
    sendConfig();
  } else if (eventDataType === "GUID_SID_REQUEST") {
    sendIds();
  };
}, false);


const sendPostMessage = (typeOfMessage, dataPayload) => {
  window.postMessage({
    "type": typeOfMessage,
    "payload": JSON.stringify(dataPayload)
  }, "*");
};
/**
 * The sendConfig method calls two different FSR methods and uses promise.all to resolve them both
 * 
 */
const sendConfig = () => {
  let configFSR;
  let getCPPS;

  if (window.FSR) {
    configFSR = new Promise((resolve, reject) => {
      let userConfig = FSR.getConfig();
      if (userConfig) {
        resolve(userConfig);
      } else {
        reject();
      }
    });

    getCPPS = new Promise((resolve, reject) => {
      FSR.CPPS.all((dataCPPS) => {

        if (dataCPPS) {
          resolve(dataCPPS);
        } else {
          reject();
        }
      });
    });
      
    Promise.all([getCPPS, configFSR]).then(configCPPS => {
      sendPostMessage("FSR_CONFIG_RESPONSE", { cpps: configCPPS[0], config: configCPPS[1] });
    }).catch(reason => {
      console.log(reason);
    });
  }
};

let sendOnValidPostObj = (() => {
  let postObj = {};
  return sessionData => {
    postObj = Object.assign({}, postObj, sessionData);
    if (postObj.dataID) {
      sendPostMessage("GUID_SID_RESPONSE", postObj);
    }
  };
})();

const sendIds = () => {
  if (window.FSR && FSR.Storage) {
    FSR.Storage.all(fsrStorage => {
      let pvsFound = {};
      for (let key in fsrStorage) {

        if (key.indexOf("pv") > -1) {
          fsrStorage[key].name = key;

          if (!pvsFound.activePV) {
            pvsFound.activePV = [fsrStorage[key]];
          } else {
            pvsFound.activePV.push(fsrStorage[key]);
          }
        }
      }
      sendOnValidPostObj(pvsFound);
    });

    FSR.getSession(sessionData => {
      sendOnValidPostObj({
        "sessionID": sessionData.sessionid,
        "dataID": sessionData.gsessionid
      });
    });
  }
};
