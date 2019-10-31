import React from "react";
import CircularProgress from "material-ui/CircularProgress";

const styles = {
  spinnerStyles: { margin: "35px auto", display: "block" },
  loadingPaneStyles: { padding: "5px 10px" }
};

export default function GetConfigLoading(props){
  return (
    <div style={styles.loadingPaneStyles} id="GetConfigLoading">
      <p>Attempting to fetch FSR configuartion from the active window...</p>
      <CircularProgress size={70} thickness={7} style={styles.spinnerStyles} />
    </div>
  );
};