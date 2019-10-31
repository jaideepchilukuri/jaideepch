import * as settingsActions from "../actions/settings-actions";

const regeisterSharedActions = () => {
  window.settingsActions = settingsActions;
};

export default regeisterSharedActions();
