import React from "react";
import { object } from "prop-types";

GetConfigPaneCPPS.propTypes = { cpps: object };

export default function GetConfigPaneCPPS(props){
  let { cpps } = props;
  return <div className="statPanel">{ cpps && renderCPPList(cpps) }</div>;
};

export const renderCPPList = (cpps) => {
  return Object.keys(cpps).map(name => {
    let stringVal = JSON.stringify(cpps[name], null, 1);
    return <div key={name}><strong>{name}</strong>: {stringVal}</div>;
  });
};