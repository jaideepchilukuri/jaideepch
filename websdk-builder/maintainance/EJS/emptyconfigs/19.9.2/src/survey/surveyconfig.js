/**
 * Sets up the classes namespace
 *
 * (c) Copyright 2011 ForeSee Results, Inc.
 *
 * @author Ani Pendakur (ani.pendakur@foreseeresults.com)
 * @author Ani Pendakur: ani.pendakur $
 *
 */

/**
 * Sets up the config
 */
const defaultSurveyConfig = {
  unavailable: "<p>Feedback isn't available right now.</p><p>Please check back later.</p>",
  expired: "<p>This is an expired survey!</p>",
  submittext: "Submit",

  ext: {
    feedback_choose_topic_text: "Choose a topic",
    feedback_default_dropdown_text: "Choose..",
    feedback_ok_button_text: "OK",
    feedback_required_field_error_text: "Please fill in the required fields.",
    feedback_survey_closed_header_text: "Survey has closed",
  },
};

export { defaultSurveyConfig };
