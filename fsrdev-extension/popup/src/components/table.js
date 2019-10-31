import React from "react";
import { Table, TableBody, TableHeader, TableHeaderColumn, TableRow } from "material-ui/Table";

import TablePVRows from "./tablePVRows";

let boldSpan = {
  "fontWeight": "bold",
  "paddingLeft": "1.5em"
};

let alignTitles = {
  "textAlign": "center",
  "paddingBottom": "8px",
  "verticalAlign": "bottom"
};

class TablePV extends React.Component {
  constructor(props) {
    super(props);
    this._renderRows = this._renderRows.bind(this);
  }

  _renderRows(rows) {
    return rows.map((pv, index) => {
      return (
        <TablePVRows key={index} activePV={pv}> </TablePVRows>
      );
    });
  };
  render() {
    let activePVProps = this.props.activePV;

    if (activePVProps) {
      return (
        <Table>
          <TableHeader adjustForCheckbox={false} displaySelectAll={false}>
            <TableRow>
              <TableHeaderColumn style={alignTitles}>Name</TableHeaderColumn>
              <TableHeaderColumn style={alignTitles}>PV</TableHeaderColumn>
              <TableHeaderColumn style={alignTitles}>TTL</TableHeaderColumn>
              <TableHeaderColumn style={alignTitles}>Start</TableHeaderColumn>
              <TableHeaderColumn style={alignTitles}>Expire</TableHeaderColumn>
            </TableRow>
          </TableHeader>
          <TableBody displayRowCheckbox={false}>
            {this._renderRows(activePVProps)}
          </TableBody>
        </Table>
      );
    } else {
      return (<div><span style={boldSpan}>Current Active PVs:</span> we don't have any Active PVs</div>);
    }
  }
}

export default TablePV;