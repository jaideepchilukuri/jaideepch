const fcpROCreds =
  "Basic ZnNyLnN1cHBvcnRAYXdzLmZvcmVzZWVyZXN1bHRzLmNvbTpjZElIJjAwSnpSVmE=";

const cxsDefaultConfig = {
  clientId: null,
  siteKey: null,
  containerId: "development",
  codeVer: null,
  products: {
    trigger: true,
    feedback: true,
    record: true
  },
  storage: "COOKIE",
  brainUrl: "https://brain.foresee.com",
  recUrl: "https://record.foresee.com/rec/",
  surveyUrl: "https://survey.foreseeresults.com/survey/display",
  modernSurveyUrl: "https://cxsurvey.foresee.com/sv",
  analyticsUrl: "https://analytics.foresee.com/ingest/events",
  staticUrl: "https://static.foresee.com",
  deferredLoading: false,
  customerId: null,
  modernRecord: true,
  deviceDetectionUrl: "https://device.4seeresults.com",
  surveyAsyncCurl: "s.foresee.com",
  mobileOnExitUrl: "i.4see.mobi",
  alwaysOnLatest: 0,
  cookieSecure: false,
  cookieDomain: [],
  disable_cpps: [],
  adobeRsid: ""
};

module.exports = {
  fcpROCreds,
  cxsDefaultConfig
};
