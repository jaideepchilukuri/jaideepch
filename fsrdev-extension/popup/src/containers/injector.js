import React from "react";
import { connect } from "react-redux";
import SelectField from "material-ui/SelectField";
import MenuItem from "material-ui/MenuItem";
import TextField from "material-ui/TextField";

import MenuGroup from "../components/menu-group";
import * as settingsActions from "../../../event/src/actions/settings-actions";
import * as settingsConstants from "../../../event/src/constants/settings-constants";

const textFieldStyles = {
  style: { "height": 47, marginTop: "5px" },
  floatingLabelStyle: { "top": 13 },
  inputStyle: { "marginTop": -1 }
};

const suppressionGroupProps = {
  top: true,
  group_id: "SuppressionMenus",
  activatorLabel: "Suppress Native Web SDKs",
  activatorTooltip:
    "Disables all natively deployed ForeSee Web SDK implementations. " +
    "Will not impact tags which are injected with this extension.  Injected tags can also then be redirected as needed using extension tools."
};

const injectorGroupProps = {
  group_id: "InjectorMenus",
  activatorLabel: "Inject Web SDK",
  activatorTooltip:
    "Inject a new ForeSee Web SDK. " +
    "Injected SDKs can then be redirected with extension tools to force a different version/enviornment as needed."
};

const widthCSS = {
  width: "70%"
};

const renderMenuItems = (items) => {
  return items.map(item => <MenuItem id={item.value} key={item.value} value={item.value} primaryText={item.display || item.value} />);
};

class Injector extends React.Component {
  constructor(props) {
    super(props);
    this._renderInjectionSettings = this._renderInjectionSettings.bind(this);
  }

  _renderInjectionSettings(id, children, handler) {
    return (
      <SelectField style={widthCSS} floatingLabelText="Configuration" onChange={handler} value={this.props[id]} key={id} id={id} disabled={!this.props.injection} maxHeight={200}>
        {renderMenuItems(children)}
      </SelectField>
    );
  }
  render() {
    return (
      <div id="Injector">
        <p>
          Inject a new Web SDK sitekey onto the sites you visit.
          Check the suppression box if the page you are testing already contains a ForeSee Web SDK you wish to remove.
        </p>
        <MenuGroup {...suppressionGroupProps} activatorStatus={this.props.suppression} activatorHandler={this.props.dispatchSettingsSuppressionToggle} />
        <MenuGroup {...injectorGroupProps} activatorStatus={this.props.injection} activatorHandler={this.props.dispatchSettingsInjectionToggle}>
          {this._renderInjectionSettings("injectionConfig", settingsConstants.CONFIG_MENU, this.props.dispatchSettingsInjectionConfigSet)}
          <TextField
            {...textFieldStyles}
            value={this.props.injectionKey}
            disabled={!this.props.injection}
            hintText="Site Key"
            floatingLabelText="Site Key"
            onChange={this.props.dispatchSettingInjectionKeySet}
          />
        </MenuGroup>
      </div>
    );
  }
}

const mapStateToProps = (store) => ({
  injection: store.settings.injection,
  injectionConfig: store.settings.injectionConfig,
  injectionKey: store.settings.injectionKey,
  suppression: store.settings.suppression
});

const mapDispatchtoProps = (dispatch) => ({
  dispatchSettingsSuppressionToggle: (e, checked) => { dispatch(settingsActions.settingsSuppressionToggle(checked)); },
  dispatchSettingsInjectionToggle: (e, checked) => { dispatch(settingsActions.settingsInjectionToggle(checked)); },
  dispatchSettingsInjectionConfigSet: (e, item, value) => { dispatch(settingsActions.settingsInjectionConfigSet(value)); },
  dispatchSettingInjectionKeySet: (e, value) => { dispatch(settingsActions.settingsInjectionKeySet(value)); }
});

export default connect(mapStateToProps, mapDispatchtoProps)(Injector);
