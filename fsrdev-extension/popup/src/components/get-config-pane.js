import React from "react";
import { array, object, number, func} from "prop-types";
import Accordion from "react-responsive-accordion";
import SelectField from "material-ui/SelectField";
import MenuItem from "material-ui/MenuItem";

import GetConfigPaneGlobal from "./get-config-pane-global";
import GetConfigPaneSurveyDef from "./get-config-pane-survey-def";
import GetConfigPaneCPPS from "./get-config-pane-cpps";

const styles = {
  configPane: { overflowY: "auto", maxHeight: "295px", padding: "5px 10px" }
};

GetConfigPane.propTypes = {
  surveyDefs: array,
  config: object,
  activeSurveyDef: object,
  def: number,
  _changeDef: func
};

export default function GetConfigPane(props){
  const { activeSurveyDef, config, surveyDefs, cpps } = props;

  const renderDefDropDown = (defs) => {
    if (defs.length !== 1) {
      return (
        <SelectField floatingLabelText="Survey Definition" maxHeight={150} value={props.def} onChange={props._changeDef}>
          { defs.map((def, index) => <MenuItem value={index} key={index} primaryText={ buildDefName(def) } />) }
        </SelectField>
      );
    }
  };

  const buildDefName = (def) => 
    [def.site,def.section,def.name].filter(v => v !== undefined).reduce((v,sid) => sid += "-" + v);  

  return (
    <Accordion>
      <div data-trigger="Active Survey Definition">
        <div style={styles.configPane}>
          { activeSurveyDef ? <GetConfigPaneSurveyDef {...activeSurveyDef} /> : "Currently No Active Definition" }
        </div>
      </div>
      <div data-trigger="Global SDK Settings">
        <div style={styles.configPane}>
          <GetConfigPaneGlobal {...config} />
        </div>
      </div>
      <div data-trigger="Survey Definitions">
        <div style={styles.configPane}>
          { renderDefDropDown(surveyDefs) }
          <GetConfigPaneSurveyDef {...surveyDefs[props.def]} />
        </div>
      </div>
      <div data-trigger="Current CPPS">
        <div style={styles.configPane}>
          <GetConfigPaneCPPS cpps={cpps} />
        </div>
      </div>
    </Accordion>
  );
}
