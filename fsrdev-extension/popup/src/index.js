import React from "react";
import { render } from "react-dom";
import { Store } from "react-chrome-redux";
import { Provider } from "react-redux";
import MuiThemeProvider from "material-ui/styles/MuiThemeProvider";
import getMuiTheme from "material-ui/styles/getMuiTheme";
import PopUpMenu from "./components/popup";

const customTheme = getMuiTheme({
  palette: {
    primary1Color: "#EE2737",
    accent1Color: "#0095EA"
  }
});

const proxyStore = new Store({ portName: "FSRDevExtension" });
window.store = proxyStore;

proxyStore.ready().then(() => {
  render(
    <Provider store={ proxyStore }>
      <MuiThemeProvider muiTheme={ customTheme }>
        <PopUpMenu />
      </MuiThemeProvider>
    </Provider>,document.getElementById("app"));
});
