import React from "react";
import { connect } from "react-redux";
import SelectField from "material-ui/SelectField";
import MenuItem from "material-ui/MenuItem";
import MenuGroup from "../components/menu-group";
import CircularProgress from "material-ui/CircularProgress";
import * as settingsActions from "../../../event/src/actions/settings-actions";
import { TARGET_MENU, CONFIG_MENU } from "../../../event/src/constants/settings-constants";

const redirectionGroupProps = {
  top: true,
  group_id: "AssetRedirectorMenus",
  activatorLabel: "Redirect Web SDK Assets",
  activatorTooltip:
    "Activate redirect of Web SDK assets.  Environment can be selected from production, development. " +
    "The Web SDK version will inherit from the current detected version #, or a specific version can be selected."
};

const configGroupProps = {
  group_id: "ConfigRedirectorMenus",
  activatorLabel: "Redirect Configuration File",
  activatorTooltip: "Redirect requests for SDK config files.  Use to force loading of either the production or staging configuration."
};

const renderMenuItems = (items) => {
  return items.map(item => <MenuItem id={item.value} key={item.value} value={item.value} primaryText={item.display || item.value} />);
};

const renderVersionItems = (items, redirectEnvSelected) => {
  return items.map(item => <MenuItem id={item.value} key={item.key} value={item.value} primaryText={redirectEnvSelected.toUpperCase() + " : " + item.value} />);
};

const widthCSS = {
  width: "70%"
};

class AssetRedirector extends React.Component {
  /**
   * updateMenu handles the event when the select menu is updated, it takes the event as well as   value selected
   * @param {*} fetchVersionList 
   * @param {*} dispatchMethod 
   * @param {*} proxyEvent 
   * @param {*} id 
   * @param {*} updateVal 
   */

  updateMenu(fetchVersionList, dispatchMethod, proxyEvent, id, updateVal) {
    dispatchMethod(null, null, updateVal);
    fetchVersionList(updateVal);
  }
  /**
   * renderRedirectionSettings
   * @param {*} active 
   * @param {*} id 
   * @param {*} label 
   * @param {*} children 
   * @param {*} dispatchVersionHandler 
   */
  renderRedirectionSettings(active, id, label, children, dispatchVersionHandler) {

    let newHandler;
    if (id === "redirectionTarget") {
      newHandler = this.updateMenu.bind(null, this.props.fetchVersionList, dispatchVersionHandler);
    } else {
      newHandler = dispatchVersionHandler;
    }
    return (
      <SelectField
        style={widthCSS}
        disabled={!active}
        value={this.props[id]} key={id} id={id}
        floatingLabelText={label}
        onChange={newHandler}
        maxHeight={200}
      >
        {renderMenuItems(children)}
      </SelectField >
    );
  }
  renderRedirectionInput(active, id, label, children, handler) {
    if (this.props.latestVersions.length < 1) {
      return (
        <div>
          <div> Loading Code Versions from FCP </div>
          <CircularProgress />
        </div>
      );
    } else {

      let selectedEnv = false;
      for (let i = 0; i < TARGET_MENU.length; i++) {
        if (TARGET_MENU[i].urlTarget === this.props.redirectionTarget) {
          selectedEnv = TARGET_MENU[i].env;
        }

      }
      return (
        <SelectField
          style={widthCSS}
          disabled={!active}
          value={this.props[id]} key={id} id={id}
          floatingLabelText={label}
          onChange={handler}
          maxHeight={200}
        >
          {renderVersionItems(children, selectedEnv)}
        </SelectField>
      );
    }
  }

  render() {
    let envOptions = TARGET_MENU.map((env) => {
      return { display: env.display, value: env.urlTarget };
    });
    return (
      <div id="AssetRedirector">
        <p>
          Redirect will cause Chrome to listen all requests for Web SDK assets.
          Additional listeners can also be added to redirect config file requests
        </p>
        <MenuGroup {...redirectionGroupProps} activatorStatus={this.props.redirection} activatorHandler={this.props.dispatchSettingsRedirectionToggle}>
          {this.renderRedirectionSettings(this.props.redirection, "redirectionTarget", "SDK Environment", envOptions, this.props.dispatchSettingsRedirectionTargetSet)}
          {this.renderRedirectionInput(this.props.redirection, "redirectionVersion", "SDK Version > 19.*", this.props.latestVersions, this.props.dispatchSettingsRedirectionVersionSet)}
        </MenuGroup>
        <MenuGroup {...configGroupProps} activatorStatus={this.props.configSwap} activatorHandler={this.props.dispatchSettingsConfigSwapToggle}>
          {this.renderRedirectionSettings(this.props.configSwap, "redirectionConfig", "Configuration", CONFIG_MENU, this.props.dispatchSettingsRedirectionConfigSet)}
        </MenuGroup>
      </div>
    );
  }
}

const mapStateToProps = (store) => ({
  redirection: store.settings.redirection,
  configSwap: store.settings.configSwap,
  redirectionTarget: store.settings.redirectionTarget,
  redirectionVersion: store.settings.redirectionVersion,
  redirectionConfig: store.settings.redirectionConfig
});

const mapDispatchtoProps = (dispatch) => ({
  dispatchSettingsRedirectionToggle: (e, checked) => { dispatch(settingsActions.settingsRedirectionToggle(checked)); },
  dispatchSettingsConfigSwapToggle: (e, checked) => { dispatch(settingsActions.settingsConfigSwapToggle(checked)); },
  dispatchSettingsRedirectionTargetSet: (e, item, value) => {
    dispatch(settingsActions.settingsRedirectionTargetSet(value));
  },
  dispatchSettingsRedirectionVersionSet: (e, item, value) => { dispatch(settingsActions.settingsRedirectionVersionSet(value)); },
  dispatchSettingsRedirectionConfigSet: (e, item, value) => { dispatch(settingsActions.settingsRedirectionConfigSet(value)); }
});

export default connect(mapStateToProps, mapDispatchtoProps)(AssetRedirector);
