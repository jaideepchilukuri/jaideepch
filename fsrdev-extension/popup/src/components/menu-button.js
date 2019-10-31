import React from "react";
import PropTypes from "prop-types";
import RaisedButton from "material-ui/RaisedButton";

class MenuButton extends React.Component {
  render() {
    return (
      < RaisedButton
        style={this.props.buttonStyles}
        onClick={this.props.cbFromParent.bind(null, this.props.label)}
        label={this.props.label}
      />
    );
  }
}

MenuButton.PropTypes = {
  buttonStyles: PropTypes.object,
  label: PropTypes.string,
  cbFromParent: PropTypes.func
};

export default MenuButton;
