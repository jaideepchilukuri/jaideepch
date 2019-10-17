// This is where web sdk is looking for your fcp credentials, so I decided to use the same file to stash them
const loginFile = process.env[process.platform == "win32" ? "USERPROFILE" : "HOME"] + "/env.json";

// Don't worry about it
const fcpROCreds = "Basic ZnNyLnN1cHBvcnRAYXdzLmZvcmVzZWVyZXN1bHRzLmNvbTpjZElIJjAwSnpSVmE=";

// This is the same configuration that is pushed out from cx suite's global settings page, once you add clientid & sitekey & codeVer - to be used for pushing to other containers
const cxsDefaultConfig = {
	clientId: null,
	siteKey: null,
	containerId: "development",
	codeVer: null,
	products: {
		trigger: true,
		feedback: true,
		record: true,
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
	adobeRsid: "",
};

// These are the fcp versions before modern survey was released
const legacySurveyVersions = [
	"19.3.0",
	"19.3.1",
	"19.3.2",
	"19.3.2-v.2",
	"19.3.2-v.3",
	"19.3.3",
	"19.3.3-v.2",
	"19.3.3-v.3",
	"19.3.4",
	"19.3.5",
	"19.3.6",
	"19.3.7",
	"19.3.7-hf.1",
	"19.4.0",
	"19.4.1",
	"19.4.2",
	"19.4.3",
	"19.4.4",
	"19.5.0",
	"19.5.1",
	"19.5.2",
];

// These are the fcp versions before modern record and modern invite for desktop were released
const legacyDesktopVersions = legacySurveyVersions.concat([
	"19.6.0",
	"19.6.1",
	"19.6.2",
	"19.6.3",
	"19.6.4",
	"19.6.5",
	"19.6.6",
	"19.6.7",
	"19.6.8",
]);

// These are the versions that live in the client_code_template repo before it was merged into the client_code repo
const cctVersions = legacyDesktopVersions.concat([
	"19.7.0",
	"19.7.1",
	"19.7.2",
	"19.7.3",
	"19.7.4",
	"19.7.5",
	"19.7.6",
	"19.8.0",
	"19.8.1",
	"19.8.2",
	"19.8.3",
	"19.8.4",
	"19.8.5",
	"19.8.6",
	"19.8.7",
]);

// These are the default display values for legacy desktop invite
const legacyDesktopDefaults = {
	displayname: "default",
	template: "classicdesktop",
	vendorTitleText: "ForeSee",
	vendorAltText: "ForeSee",
	hideForeSeeLogoDesktop: "false",
	blurb:
		"Thank you for visiting our website. You have been selected to participate in a brief customer satisfaction survey to let us know how we can improve your experience.",
	noticeAboutSurvey:
		"The survey is designed to measure your entire experience, please look for it at the <u>conclusion</u> of your visit.",
	attribution: "This survey is conducted by an independent company ForeSee, on behalf of the site you are visiting.",
	trackerTitle: "ForeSee - Survey Tracker Window",
	trackerClickToView: "Click to view the survey.",
	trackerPlsLeaveOpen: "Please leave this window open.",
	trackerAtEnd: "At the end of your session, click here to begin the survey.",
	trackerDesc1:
		"It is part of the customer satisfaction survey you agreed to take on this site. You may click here when ready to complete the survey, although it should activate on its own after a few moments when you have left the site.",
	trackerDesc2:
		"Please leave this window open until you have completed your time on this site. This window is part of the customer satisfaction survey you agreed to take on this site. You may click here when ready to complete the survey, although it should activate on its own after a few moments when you have left the site.",
	trackerDesc3:
		"Thank you for helping us improve your website experience. This survey is conducted by an independent company, ForeSee, on behalf of the site you visited.",
	trackerCorp: "ForeSee. All rights reserved.",
	trackerPrivacy: "Privacy",
};

module.exports = {
	loginFile,
	fcpROCreds,
	cxsDefaultConfig,
	legacySurveyVersions,
	legacyDesktopVersions,
	cctVersions,
	legacyDesktopDefaults,
};
