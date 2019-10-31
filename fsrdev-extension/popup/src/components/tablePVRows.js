import React from "react";
import moment from "moment";
import { TableRow, TableRowColumn } from "material-ui/Table";

const styleOverWrite = {
  "textOverflow": "initial",
  "whiteSpace": "initial",
  "textAlign": "center",
  "paddingLeft": "12px",
  "paddingRight": "12px"
};

class TablePVRows extends React.Component {
  constructor(props) {
    super(props);
    this._updateTime = this._updateTime.bind(this);
  }

  /**
   * The _updateTime function formats timestamps in milliseconds to a readable format
   * @param {*} pv 
   */
  _updateTime(pv) {
    let timeFormated = {};
    let tempTime;
    if (pv.x) {
      timeFormated.x = moment(pv.x).format("MMM D, h:mma");
    }

    if (pv.t) {
      timeFormated.t = moment(pv.t).format("MMM D, h:mma");
    }

    if (pv.ttl || pv.tl.ms) {
      let hours;
      let minutes;
      tempTime = moment.duration(pv.ttl || pv.tl.ms);

      if (tempTime.days() === 1) {
        hours = 24 + "h";
      } else {
        hours = tempTime.hours() + "h";
      }
      minutes = tempTime.minutes() > 0 ? tempTime.minutes() + "m" : "";

      timeFormated.ttl = hours + minutes;
    }

    return Object.assign({}, this.props.activePV, timeFormated);
  }

  render() {
    let pv = this._updateTime(this.props.activePV);
    return (
      <TableRow>
        <TableRowColumn style={styleOverWrite}>{pv.name}</TableRowColumn>
        <TableRowColumn style={styleOverWrite}>{pv.v}</TableRowColumn>
        <TableRowColumn style={styleOverWrite}>{pv.ttl || pv.tl.ms || "Not Found"}</TableRowColumn>
        <TableRowColumn style={styleOverWrite}>{pv.t || "Not Found"}</TableRowColumn>
        <TableRowColumn style={styleOverWrite}>{pv.x}</TableRowColumn>
      </TableRow>
    );
  }
};

export default TablePVRows;
