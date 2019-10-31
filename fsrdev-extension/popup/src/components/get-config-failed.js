import React from "react";

const styles = {
  errorText: {color: "red"},
  errorPaneStyles: {padding: "5px 10px"}
};

export default function GetConfigFailed(props){
  return (
    <div id="GetConfigFailed" style={styles.errorPaneStyles}>
      <p>
        <em style={styles.errorText}>Unable to fetch configuration:</em>
        this page either does not contain a ForeSee Web SDK with active CxMeasure surveys,
         or the code version is &lt;v19X</p>
      <p>You can use the inject or redirect tools to insert an appropriate SDK and then try again.</p>
    </div>
  );
};
