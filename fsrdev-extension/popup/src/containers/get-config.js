// State of this container is specifically NOT connected to the redux store.
// Redux state is shared accross windows/tabs and would provide inconsistent
// config reporting.  Limiting state to this componenet forces data dispalyed
// to show config stats of window/tab where the extension popup is opened. 

/* global chrome */
import React from "react";
import GetConfigLoading from "../components/get-config-loading";
import GetConfigFailed from "../components/get-config-failed";
import GetConfigPane from "../components/get-config-pane";

class GetConfig extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      ready: false,
      data: false,
      cpps: 0,
      def: 0
    };
    this._changeDef = this._changeDef.bind(this);
    this._getFSRConfig = this._getFSRConfig.bind(this);
    this._setFailedState = this._setFailedState.bind(this);
    this._getFSRConfig();
  }

  _getFSRConfig(timeout = 1500, attempt = 0) {
    setTimeout(() => {
      let messageSendingPromise = new Promise((resolve, reject) => {
        console.log("Messaging active tab....");
        chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
          chrome.tabs.sendMessage(tabs[0].id, { type: "GET_FSR_CONFIG" }, (response) => {
            if (response && response.config) {
              let { cpps, config } = JSON.parse(response.config);
              if (!this.state.data) {
                this.setState(() => {
                  return Object.assign({}, this.state, { ready: true, data: true }, { cpps }, config);
                });
                resolve();
              }
            } else if (attempt >= 5) {
              reject();
            }
            this._getFSRConfig(timeout, attempt + 1);
          });
        });
      });
      messageSendingPromise.catch((err) => {
        console.log("Err: Unable to get config will try again: ", err);
        this._setFailedState();
      });
    }, timeout * attempt);
  }
  _setFailedState() {
    this.setState(() => {
      return Object.assign({}, this.state, { ready: true, data: false });
    });
  }
  _changeDef(event, index, value) {
    this.setState(Object.assign({}, this.state, { def: value }));
  }

  render() {
    let configBody;
    if (this.state.data) {
      configBody = (
        <GetConfigPane
          config={this.state.config}
          surveyDefs={this.state.surveydefs}
          cpps={this.state.cpps}
          activeSurveyDef={this.state.active_surveydef}
          _changeDef={this._changeDef}
          def={this.state.def}
        />
      );
    } else {
      configBody = !this.state.ready ? <GetConfigLoading /> : <GetConfigFailed />;
    }

    return (
      <div id="GetConfig" >
        {configBody}
      </div >
    );
  }
}

export default GetConfig;
