import React from "react";
import { string } from "prop-types";
import IconButton from "material-ui/IconButton";

const styles = {
  top: {
    width: "16px",
    height: "16px",
    padding: "0",
    float: "left",
    display: "table-cell",
    margin: "0 15px 3px 0"
  },
  toolTip: {
    width: "225px",
    whiteSpace: "normal !important",
    height: "auto",
    lineHeight: "14px",
    marginTop: "-30px"
  },
  icon: { 
    fontSize: "16px" 
  }
};

HelpTip.PropTypes = {
  contents: string
};

export default function HelpTip(props){
  return(
    <IconButton className="info-icon" style={styles.top} iconStyle={styles.icon} disabled={true}
      iconClassName="material-icons" tooltipStyles={styles.toolTip} tooltipPosition="bottom-left" tooltip={props.contents}>
      info_outline
    </IconButton>
  );
}
