import React from "react";
import { Step, Stepper, StepLabel, StepContent } from "material-ui/Stepper";
import RaisedButton from "material-ui/RaisedButton";
import FlatButton from "material-ui/FlatButton";
import ProcessVideoMenu from "./video-lists";

const urlLink = {
  "paddingTop": "1em",
  "paddingBottom": "1em",
  "wordBreak": "break-all"
};

/**
 * Vertical steppers are designed for narrow screen sizes. They are ideal for mobile.
 *
 * To use the vertical stepper with the contained content as seen in spec examples,
 * you must use the `<StepContent>` component inside the `<Step>`.
 *
 * <small>(The vertical stepper can also be used without `<StepContent>` to display a basic stepper.)</small>
 */
class ProcessVideoPath extends React.Component {
  constructor(props) {
    super(props);
    this.handleChange = this.handleChange.bind(this);
    this.handleNext = this.handleNext.bind(this);
    this.handlePrev = this.handlePrev.bind(this);
    this._createURL = this._createURL.bind(this);
    this.processEvent = this.processEvent.bind(this);
    this.renderStepActions = this.renderStepActions.bind(this);
    this.state = {
      finished: false,
      stepIndex: 0,
      env: "Choose Env to Process",
      processingStarted: "",
      serverResponse: false
    };
  }
  handleChange(env) {
    this.setState(Object.assign({}, this.state, { "env": env }));
  }

  /**
   * This method creates the url for what the replay video
   * 
   * @param {*} env 
   * @param {*} guid 
   * @param {*} sid 
   */
  _createURL(env, guid, sid) {

    const linkRef = `https://${env}replay.replay.answerscloud.com/replay/replay?session_id=${sid}&gsession_id=${guid}&page_number=0`;

    return (
      <div>
        <div>URL of video after it processes:</div>
        <div style={urlLink}> {linkRef} </div>
        <a target="_blank" href={linkRef}>Open video in a new Tab</a>
      </div>
    );
  }

  processEvent(env) {
    let processed;
    if (this.props.guid) {
      let myRequest = `https://${env}replay.replay.answerscloud.com/process/${this.props.guid}`;
      const processVideo = fetch(myRequest)
        .then((response) => response.text())
        .then((parsedData) => {
          if (parsedData.indexOf("Workflow") > -1) {
            this.setState(Object.assign({}, this.state, { "processingStarted": "Congrats the video started to process, we hope you got the env correct", "serverResponse": true }));
          }
        })
        .catch((err) => {
          this.setState(Object.assign({}, this.state, { "processingStarted": "This did not work please check the url and env" }));
        });
    }
  }

  handleNext() {
    const { stepIndex } = this.state;
    this.setState({
      stepIndex: stepIndex + 1,
      finished: stepIndex >= 2,
    });
  };

  handlePrev() {
    const { stepIndex } = this.state;
    if (stepIndex > 0) {
      this.setState({ stepIndex: stepIndex - 1 });
    }
  };

  renderStepActions(step, stageData, isdisabled) {
    const { stepIndex } = this.state;
    const steps = {
      "0": "Process Video",
      "1": "Display Video Url",
      "2": "Finish"
    };

    return (
      <div style={{ margin: "12px 0" }}>
        <RaisedButton
          label={steps[stepIndex]}
          disableTouchRipple={true}
          disableFocusRipple={true}
          disabled={!isdisabled}
          primary={true}
          onClick={
            () => {
              this.handleNext();
              this.processEvent(stageData);
            }
          }
          style={{ marginRight: 12 }}
        />
        {step > 0 && (
          <FlatButton
            label="Back"
            disabled={stepIndex === 0}
            disableTouchRipple={true}
            disableFocusRipple={true}
            onClick={this.handlePrev}
          />
        )}
      </div>
    );
  }

  render() {
    const { finished, stepIndex } = this.state;
    return (
      <div>
        <Stepper activeStep={stepIndex} orientation="vertical">
          <Step>
            <StepLabel>Select Environment to Process Video</StepLabel>
            <StepContent>
              <ProcessVideoMenu handleChange={this.handleChange} guid={this.props.guid}></ProcessVideoMenu>
              {this.renderStepActions(0, this.state.env, this.props.guid)}
            </StepContent>
          </Step>
          <Step>
            <StepLabel>Video Processing Status</StepLabel>
            <StepContent>
              <div>{this.state.processingStarted}</div>
              {this.renderStepActions(1, this.state.processingStarted, this.state.serverResponse)}
            </StepContent>
          </Step>
          <Step>
            <StepLabel>Resulting information</StepLabel>
            <StepContent>
              {this._createURL(this.state.env, this.props.guid, this.props.sid)}
              {this.renderStepActions(2)}
            </StepContent>
          </Step>
        </Stepper>
        {finished && (
          <p style={{ margin: "20px 0", textAlign: "center"}}>
            <a href="#"
              onClick={(event) => {
                event.preventDefault();
                this.setState({ stepIndex: 0, finished: false });
              }}>
              Click here
            </a> to reset the example.
          </p>
        )}
      </div>
    );
  }
}

export default ProcessVideoPath;