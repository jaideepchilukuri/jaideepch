import React from "react";
import DropDownMenu from "material-ui/DropDownMenu";
import MenuItem from "material-ui/MenuItem";
import { PROCESS_ENVIORNMENTS } from "../../../event/src/constants/settings-constants";

const styles = {
  customWidth: {
    width: 350,
  },
};

export default class ProcessVideoMenu extends React.Component {

  constructor(props) {
    super(props);
    this.menuOptions = this.menuOptions.bind(this);
    this.handleUpdate = this.handleUpdate.bind(this);
    this.state = { value: 0 };
  }

  handleUpdate(event, index, value) {
    this.setState({ value });
    this.props.handleChange(value);
  }


  menuOptions(envOptions) {
    return envOptions.map((env) => {
      return <MenuItem value={env.urlEnv} key={env.value} primaryText={env.label} />;
    });
  }

  render() {
    const idsNotFound = !this.props.guid && !this.props.sid;
    return (
      <div>
        <DropDownMenu
          value={this.state.value}
          onChange={this.handleUpdate}
          style={styles.customWidth}
          autoWidth={false}
          disabled={idsNotFound}
        >
          <MenuItem disabled={true} value={0} key={0} primaryText="Process Video in the follow Environment" />
          {this.menuOptions(PROCESS_ENVIORNMENTS)}
        </DropDownMenu>
      </div>
    );
  }
}