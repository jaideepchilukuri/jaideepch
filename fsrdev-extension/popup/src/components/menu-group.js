import React from "react";
import PropTypes from "prop-types";
import Checkbox from "material-ui/Checkbox";
import HelpTip from "./help-tip";

const rowStyles = { display: "table-row" };
const cellStyles = { display: "table-cell" };
const menuSetStyles = { margin: "0 0 12px 0", padding: "12px 0", borderBottom: "1px solid rgb(224, 224, 224)", dispaly: "table" };
const menuSetStylesTop = Object.assign({}, menuSetStyles, { margin: "12px 0", borderTop: "1px solid rgb(224, 224, 224)" });

class MenuGroup extends React.Component {
  setMenuStyles(top) {
    return top ? menuSetStylesTop : menuSetStyles;
  }

  render() {
    return (
      <div id={this.props.group_id} style={this.setMenuStyles(this.props.top)}>
        <div style={rowStyles}>
          <Checkbox
            style={cellStyles}
            onCheck={this.props.activatorHandler}
            checked={this.props.activatorStatus}
            label={this.props.activatorLabel}
          />
          <HelpTip contents={this.props.activatorTooltip} />
        </div>
        {this.props.children}
      </div>
    );
  }
}

MenuGroup.PropTypes = {
  top: PropTypes.bool,
  group_id: PropTypes.string,
  activatorLabel: PropTypes.string,
  activatorTooltip: PropTypes.string,
  activatorStatus: PropTypes.bool,
  activatorHandler: PropTypes.func
};

export default MenuGroup;
