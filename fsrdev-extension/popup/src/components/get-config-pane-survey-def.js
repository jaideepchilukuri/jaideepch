import React from "react";
import { string, object, bool } from "prop-types";

import { renderExcludes } from "./helpers/render_excludes";

GetConfigPaneSurveyDef.PropTypes = {
  name: string,
  site: string,
  section: string,
  criteria: object,
  cxRecord: bool,
  selectMode: string,
  include: object,
  inviteExclude: object
};

export default function GetConfigPaneSurveyDef(props) {
  const renderIfSet = (title, prop) => {
    if(prop){ return <div><strong>{title}:</strong> {JSON.stringify(prop)}</div>; }
  };

  const renderSP = (prop) => {
    if(prop){ return (<div><strong>Sample Rates:</strong> {prop.sp.reg}% sample, at loyalty factor {prop.lf}</div>); }
  };

  return (
    <div className="statPanel">
      {renderIfSet("Name",props.name)}
      {renderIfSet("Site",props.site)}
      {renderIfSet("Section",props.section)}
      {renderSP(props.criteria)}
      {renderIfSet("Supports Desktop",props.criteria.supportsDesktop)}
      {renderIfSet("Supports Mobile",props.criteria.supportsSmartPhone)}
      {renderIfSet("Supports Tablet",props.criteria.supportsTablets)}
      <div><strong>Replay Enabled:</strong> {JSON.stringify(props.cxRecord)}</div>
      <div><strong>Select Mode:</strong> {props.selectMode}</div>
      <div><strong>Survey Includes:</strong> {renderExcludes(props.include)}</div>
      <div><strong>Survey Excludes:</strong> {renderExcludes(props.inviteExclude)}</div>
    </div>
  );
}

