import React from "react";
import { Tabs, Tab } from "material-ui/Tabs";
import FontIcon from "material-ui/FontIcon";

import AssetRedirector from "../containers/asset-redirector";
import Injector from "../containers/injector";
import MethodInjector from "../containers/MethodInjector";
import GetConfig from "../containers/get-config";
import Replay from "../containers/replay";
import { TARGET_MENU } from "./../../../event/src/constants/settings-constants";

const tabPane = {
  padding: "5px 10px",
  minHeight: "400px"
};
const unpaddedTab = Object.assign({}, tabPane, { padding: "0" });
const tabButton = {
  borderBottom: "2px solid #888",
  zIndex: 0
};

class PopUpMenu extends React.Component {
  constructor(props) {
    super(props);
    this.state = {
      latestVersions: []
    };
    this.updateVersionList = this.updateVersionList.bind(this);
    this.handleDataFetch = this.handleDataFetch.bind(this);
  }

  /**
   * After Component mounts this function is called to retrieve a list of code versions
   */
  componentDidMount() {
    this.handleDataFetch(store.getState().settings.redirectionTarget);
  }

  /**
   *  handleDataFetch: Calls FCP to get the list of code versions per environment 
   * @param {*} redirectEnvSelected 
   */
  handleDataFetch(redirectEnvSelected) {

    let findEnvUrlPrefix = TARGET_MENU.find((env) => env.urlTarget === redirectEnvSelected);
    let headers = new Headers();
    headers.append("Authorization", "Basic " + window.btoa("fcp_plugin@aws.foreseeresults.com:!@#$qwerASDFzxcv"));
    headers.append("Content-Type", "text/plain");
    return fetch(`https://${findEnvUrlPrefix.urlVersionList}fcp.foresee.com/code`, {
      method: "GET",
      headers: headers
    }).then((versions) => {
      return versions.text();
    }).then((versionList) => {
      let getData = JSON.parse(versionList);
      this.updateVersionList(getData.message, redirectEnvSelected);
    }).catch((err) => { console.log("Err in latestVersions: ", err); });
  }

  /**
   * updateVersionList: Iterate through the list of versions filtering out the invalid ones
   * @param {*} versions 
   * @param {*} redirectEnvSelected 
   */
  updateVersionList(versions, redirectEnvSelected) {
    let latestVersions = [];
    if (Array.isArray(versions)) {
      versions.forEach((version, index) => {
        if (version.invalid === 0) {
          latestVersions.unshift({ value: version.version, key: index });
        }
      });
      this.setState(Object.assign({}, this.state, { latestVersions: latestVersions }));
    }
  }

  render() {
    return (
      <Tabs>
        <Tab
          icon={<FontIcon className="material-icons"> settings_applications </FontIcon>}
          label="METHODS"
          style={tabButton}>
          <div style={tabPane}><MethodInjector /></div>
        </Tab>
        <Tab icon={<FontIcon className="material-icons"> find_replace </FontIcon>}
          label="REDIRECT"
          style={tabButton}>
          <div style={tabPane}><AssetRedirector fetchVersionList={this.handleDataFetch} latestVersions={this.state.latestVersions} /></div>
        </Tab>
        <Tab icon={< FontIcon className="material-icons" > system_update_alt </FontIcon>}
          label="INJECT"
          style={tabButton}>
          <div style={tabPane}><Injector /></div>
        </Tab>
        <Tab icon={< FontIcon className="material-icons" > replay </FontIcon>}
          label="REPLAY"
          style={tabButton}>
          <div style={tabPane}><Replay /></div>
        </Tab>
        <Tab icon={< FontIcon className="material-icons" > settings_applications </FontIcon>}
          label="CONFIG"
          style={tabButton}>
          <div style={unpaddedTab}><GetConfig /></div>
        </Tab>
      </Tabs>
    );
  }
}

export default PopUpMenu;
