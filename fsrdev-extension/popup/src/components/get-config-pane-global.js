import React from "react";
import { string, bool, object, number } from "prop-types";

import { renderExcludes } from "./helpers/render_excludes";

GetConfigPaneGlobal.PropTypes = {
  site_id: string,
  id: string,
  hasReplay: bool,
  repeatDays: object,
  browser_cutoff: object,
  platform_cutoff: object,
  trackerHeartbeatTimeout: number,
  cpps: object,
  inviteExclude: object,
  globalExclude: object
};

export default function GetConfigPaneGlobal(props) {
  let { site_id, id, hasReplay, repeatDays, browser_cutoff, platform_cutoff,
    trackerHeartbeatTimeout, cpps, globalExclude, inviteExclude } = props;

  const renderCPPS = (raw_cpps) => {
    return Object.keys(raw_cpps).map(name => {
      let cpp = raw_cpps[name];
      let target = cpp.name || cpp.val;
      return <div key={name}><em>{name}</em> - from a {cpp.source}, named <em>{target}</em></div>;
    });
  };

  return (
    <div className="statPanel">
      <div><strong>Site Id:</strong> {site_id}</div>
      <div><strong>Client ID:</strong> {id}</div>
      <div><strong>CxReplay:</strong> {hasReplay}</div>
      <div><strong>Repeat Days:</strong>
        { repeatDays && <span>{repeatDays.accept} days on accept, {repeatDays.decline} day on decline</span> }
      </div>
      <div><strong>Browser Cutoffs:</strong> {JSON.stringify(browser_cutoff, null, 1)}</div>
      <div><strong>Platform Cutoffs:</strong> {JSON.stringify(platform_cutoff, null, 1)}</div>
      <div><strong>Tracker Heart Beat:</strong> {trackerHeartbeatTimeout}</div>
      <div><strong>CPPS:</strong> {cpps && renderCPPS(cpps)}</div>
      <div><strong>Global Excludes:</strong> {renderExcludes(globalExclude)}</div>
      <div><strong>Invite Excludes:</strong> {renderExcludes(inviteExclude)}</div>
    </div>
  );
}