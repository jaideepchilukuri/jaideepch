/* global chrome */
import React from "react";
import { connect } from "react-redux";
import { Subheader } from "material-ui";

import MenuButton from "../components/menu-button";
import ProcessVideoPath from "../components/video-process-path";
import * as settingsActions from "../../../event/src/actions/settings-actions";

const videoProcessButton = {
  width: "50%",
  margin: ".1em"
};

let methodButtonStyles = {
  "minWidth": "48%",
  "marginLeft": "1%",
  "marginRight": "1%",
  "marginTop": "2%",
  "marginBottom": "2%",
  "maxWidth": "75%"
};

let additionalCSS = {
  "minWidth": "70%",
  "flex": 1,
  "marginLeft": "auto",
  "marginRight": "auto"
};

let boldSpan = {
  fontWeight: "bold",
  paddingLeft: "1.5em"
};

const getGUIDSID = "GET_GUID_SID";

class Replay extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      guid: false,
      sid: false,
      activePV: false
    };
    this._renderMenuButtons = this._renderMenuButtons.bind(this);
    this._clickMethod = this._clickMethod.bind(this);
    this._setGuid = this._setGuid.bind(this);
    this._setPVS = this._setPVS.bind(this);
    this._clickMethod(getGUIDSID);
  }

  _renderMenuButtons(items, clickFunc) {
    let finalButtonCSS;
    return items.map((item, index) => {
      if (index === items.length - 1) {
        finalButtonCSS = Object.assign({}, methodButtonStyles, additionalCSS);
      }
      return <MenuButton
        buttonStyles={finalButtonCSS || methodButtonStyles}
        id={item.value}
        key={item.value}
        label={item.label}
        cbFromParent={clickFunc}></MenuButton>;
    });
  }

  _setGuid(ids) {

    if (ids && this.state.guid !== ids.guid) {
      this.setState(Object.assign({}, this.state, ids));
    }
    return (
      <div>
        <div>
          <span style={boldSpan}>
            Current GUID:
          </span>{this.state.guid || " No GUID found for this client"}
        </div>
        <div>
          <span style={boldSpan}>
            Current SID:
          </span>{this.state.sid || " No SID found for this client"}
        </div>
      </div>
    );
  }

  _setPVS(pvs) {
    if (!this.state.activePV && pvs) {
      this.setState(Object.assign({}, this.state, pvs));
    }
  }

  _clickMethod(dataType) {
    if (dataType !== getGUIDSID) {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { type: dataType }, (response) => { });
      });
      return;
    }

    let sIid = setInterval(() => {
      chrome.tabs.query({ active: true, currentWindow: true }, (tabs) => {
        chrome.tabs.sendMessage(tabs[0].id, { type: dataType }, (response) => {

          if (response && response.guidID) {
            let currateIds = JSON.parse(response.guidID);

            if (currateIds.dataID) {
              this._setGuid({ "guid": currateIds.dataID, "sid": currateIds.sessionID });
            }

            if (currateIds.activePV) {
              this._setPVS({ "activePV": currateIds.activePV });
            }

            if (sIid) {
              clearInterval(sIid);
            }
          }
        });
      });
    }, 1000);
  }

  render() {
    return (
      <div>
        <Subheader>
          Process a video with GUID
        </Subheader>
        <div>
          {this._setGuid()}
        </div>

        <ProcessVideoPath
          style={videoProcessButton}
          guid={this.state.guid}
          sid={this.state.sid}>
        </ProcessVideoPath>
      </div>
    );
  }
};

const mapStateToProps = (store) => ({ injection: store.settings.injection, injectionConfig: store.settings.injectionConfig, injectionKey: store.settings.injectionKey, suppression: store.settings.suppression });

const mapDispatchtoProps = (dispatch) => ({
  dispatchSettingsSuppressionToggle: (e, checked) => { dispatch(settingsActions.settingsSuppressionToggle(checked)); },
  dispatchSettingsInjectionToggle: (e, checked) => { dispatch(settingsActions.settingsInjectionToggle(checked)); },
  dispatchSettingsInjectionConfigSet: (e, item, value) => { dispatch(settingsActions.settingsInjectionConfigSet(value)); },
  dispatchSettingInjectionKeySet: (e, value) => { dispatch(settingsActions.settingsInjectionKeySet(value)); }
});

export default connect(mapStateToProps, mapDispatchtoProps)(Replay);
