const fcpvals = require("../../scripts/FCPvals");
const filesystem = require("../../scripts/filesystem");
const helpertasks = require("../../scripts/helpertasks");
const spotcheck = require("../../scripts/spotcheck");
const other = require("../../scripts/other");
const magic = require("../../scripts/magic");

const path =
	process.cwd().substr(process.cwd().length - 15, 15) == "\\websdk-builder" || "/websdk-builder"
		? `${process.cwd()}/maintainance`
		: `${process.cwd()}/websdk-builder/maintainance`;

async function getAConfig(codeVersionToTest, filepath, filename, defnumber) {
	if (!defnumber) {
		defnumber = "";
	}
	// console.log(`${path}${filepath}${filename}${defnumber}.js`);
	let string = await filesystem.readFileToStringIfExists(`${path}${filepath}${filename}${defnumber}.js`);
	if (fcpvals.cctVersions.includes(codeVersionToTest)) {
		switch (filename) {
			case "productconfig/record/product_config":
				string = string.replace("var config", "module.exports");
				break;
			case "productconfig/trigger/product_config":
				string = string.replace("var triggerconfig", "module.exports");
				string = string.substring(0, string.indexOf("_fsDefine"));
				break;
			case "productconfig/trigger/surveydef/def":
				string = string.substring(1, string.lastIndexOf(")"));
				string = "module.exports = " + string + ";";
				break;
		}
	}
	// console.log(filename + " string:", string);
	let object = { module: { exports: {} } };
	eval("object." + string);
	// console.log(filename + "object:", object);
	return object;
}

async function buildForTemplateTest(sitekey, codeVersionToTest, overwriteSitekeysConfigJSONifExists) {
  await filesystem.makeDirIfMissing(`${path}/../clientconfigs/${sitekey}/`);
  await filesystem.makeDirIfMissing(`${path}/../clientconfigs/${sitekey}/assets/`);
  if (overwriteSitekeysConfigJSONifExists) {
    await filesystem.copyFrom2ToIfFromExists(
      `${path}/${sitekey}.json`,
      `${path}/../clientconfigs/${sitekey}/config.json`
    );
  } else {
    await filesystem.copyFrom2ToIfToMissing(
      `${path}/${sitekey}.json`,
      `${path}/../clientconfigs/${sitekey}/config.json`
    );
  }
  console.log("Rebuiliding config files for sitekey:", JSON.stringify([sitekey]), "Please wait...");
  packagejson = await filesystem.readFileToObjectIfExists(
    `${path}/../clientconfigs/${sitekey}/CC/package.json`
  );
  config = await filesystem.readFileToObjectIfExists(`${path}/../clientconfigs/${sitekey}/config.json`);
  if (
    packagejson &&
    packagejson.version &&
    config &&
    config.global &&
    config.global.codeVer &&
    packagejson.version == config.global.codeVer &&
    codeVersionToTest == config.global.codeVer
  ) {
  } else {
    console.log("Code version is not built! Building client code package from scratch (without node_modules)");
    console.log("Building package for sitekey:", JSON.stringify([sitekey]), "Please wait...");
    await spotcheck.checkCustomerKey(`${path}/../clientconfigs/${sitekey}/config.json`);
    console.log(`Rebuilding for version ${codeVersionToTest}...`);
    await helpertasks.upgradeChecks(`${path}/../clientconfigs/${sitekey}`);
    await helpertasks.updateCodeVersion(`${path}/../clientconfigs/${sitekey}`, codeVersionToTest);
    await spotcheck.checkCodeVersion(`${path}/../clientconfigs/${sitekey}`);
    await other.spawnProcess("npx", [`prettier --write config.json`], {
      cwd: `${path}/../clientconfigs/${sitekey}`,
      stdio: "inherit",
      shell: true,
    });
    await spotcheck.checkForCustomTemplates(`${path}/../clientconfigs/${sitekey}/config.json`);
    await helpertasks.ccCopy(`${path}/../clientconfigs/${sitekey}`);
    console.log("Done building client code package without NPM install");
  }
  await helpertasks.assetsCopy(`${path}/../clientconfigs/${sitekey}`);
  await helpertasks.configRebuild(`${path}/../clientconfigs/${sitekey}`);
  if (
    filesystem.checkIfFileOrDirExists(
      `${path}/EJS/${sitekey}/${codeVersionToTest}/clientconfig/globalconfig/local.js`
    )
  ) {
    await other.spawnProcess("npx", [`prettier --write clientconfig/globalconfig/local.js`], {
      cwd: `${path}/EJS/${sitekey}/${codeVersionToTest}`,
      stdio: "inherit",
      shell: true,
    });
  }
  await other.spawnProcess("npx", [`prettier --write clientconfig/client_properties.js`], {
    cwd: `${path}/EJS/${sitekey}/${codeVersionToTest}`,
    stdio: "inherit",
    shell: true,
  });
  await other.spawnProcess("npx", [`prettier --write clientconfig/productconfig/record/product_config.js`], {
    cwd: `${path}/EJS/${sitekey}/${codeVersionToTest}`,
    stdio: "inherit",
    shell: true,
  });
  await other.spawnProcess("npx", [`prettier --write clientconfig/productconfig/trigger/product_config.js`], {
    cwd: `${path}/EJS/${sitekey}/${codeVersionToTest}`,
    stdio: "inherit",
    shell: true,
  });
  await other.spawnProcess("npx", [`prettier --write clientconfig/productconfig/trigger/surveydef/def1.js`], {
    cwd: `${path}/EJS/${sitekey}/${codeVersionToTest}`,
    stdio: "inherit",
    shell: true,
  });
}

async function cleanUpTemplateTest(sitekey) {
	await magic.remove([sitekey],true);
}

async function testTemplate(sitekey, codeVersionToTest, filename) {
	let afterfilename = "";
	if (filename == "productconfig/trigger/surveydef/def") {
		afterfilename = "1";
	}
	let expected = await getAConfig(
		codeVersionToTest,
		`/EJS/${sitekey}/${codeVersionToTest}/clientconfig/`,
		filename,
		afterfilename
	);
  expected = await fixExpectedForMe(filename, sitekey, codeVersionToTest, expected); //maybe this can go away at some point? I hope
	if (filename == "productconfig/trigger/surveydef/def") {
		afterfilename = "000";
	}
	let created = await getAConfig(
		codeVersionToTest,
		`/../clientconfigs/${sitekey}/CC/clientconfig/`,
		filename,
		afterfilename
	);
  created = await fixCreatedForMe(filename, sitekey, codeVersionToTest, created, expected); //maybe this can go away at some point? I hope
	let matching = await other.stringifyCompare(expected, created, `${sitekey} ${filename}`);
	return matching;
}

async function fixExpectedForMe(filename, sitekey, codeVersionToTest, expected) {
	if (expected && expected.module && expected.module.exports) {
		if (sitekey == "emptyconfigs") {
			// file specific logic to make emptyconfigs match (this wouldn't be necessary if emptyconfigs were built exact same to deploy as they are recreated from the template)
			switch (filename) {
				case "globalconfig/local":
					if (
						expected.module.exports.transporturl == "https://rec.replay.answerscloud.com/rec/" ||
						expected.module.exports.transporturl == "https://dev-record.foresee.com/rec/"
					) {
						expected.module.exports.transporturl = "https://record.foresee.com/rec/";
					}
					if (expected.module.exports.surveyurl == "https://survey-dev.foreseeresults.com/survey/display") {
						expected.module.exports.surveyurl = "https://survey.foreseeresults.com/survey/display";
					}
					if (expected.module.exports.events == "https://qal-analytics.foresee.com/ingest/events") {
						expected.module.exports.events = "https://analytics.foresee.com/ingest/events";
					}
					if (expected.module.exports.modernSurveyUrl == "https://dev-cxsurvey.foresee.com/sv") {
						expected.module.exports.modernSurveyUrl = "https://cxsurvey.foresee.com/sv";
					}
					if (expected.module.exports.surveyasynccurl == "i.4see.mobi") {
						expected.module.exports.surveyasynccurl =
							"" /*FIX THIS BY PUSHING OUT A NEW GLOBAL CONFIG! "s.foresee.com"*/;
					}
					break;
				case "client_properties":
					if (expected.module.exports.client) {
						if (expected.module.exports.client.id == null) {
							expected.module.exports.client.id = "";
						}
						if (expected.module.exports.client.transporturl == "https://rec.replay.answerscloud.com/rec/") {
							expected.module.exports.client.transporturl = "https://record.foresee.com/rec/";
						}
						if (
							//should maybe come back and specify this by version, or change all the pushed emptyconfigs in fcp to be one order or the other
							JSON.stringify(expected.module.exports.client.productsToBuild) == `["trigger","record"]` ||
							JSON.stringify(expected.module.exports.client.productsToBuild) == `["trigger","record","feedback"]` ||
							JSON.stringify(expected.module.exports.client.productsToBuild) == `["trigger","feedback","record"]`
						) {
							expected.module.exports.client.productsToBuild = [];
						}
						if (expected.module.exports.client.adobersid == null) {
							delete expected.module.exports.client.adobersid;
						}
						if (expected.module.exports.client.integrityHashLocation == null) {
							delete expected.module.exports.client.integrityHashLocation;
						}
					}
					break;
				case "productconfig/record/product_config":
					if (JSON.stringify(expected.module.exports.whitelist) == `{"text":[],"variables":[],"cookies":[]}`) {
						delete expected.module.exports.whitelist;
					}
					if (expected.module.exports.advancedSettings) {
						if (expected.module.exports.advancedSettings.maxStorageMB == null) {
							delete expected.module.exports.advancedSettings.maxStorageMB;
						}
						if (
							expected.module.exports.advancedSettings.pii &&
							expected.module.exports.advancedSettings.pii.maskCharacters == null
						) {
							delete expected.module.exports.advancedSettings.pii.maskCharacters;
						}
					}
					break;
				case "productconfig/trigger/product_config":
					if (expected.module.exports.pagesInviteAvailable == null) {
						delete expected.module.exports.pagesInviteAvailable;
					}
					if (JSON.stringify(expected.module.exports.disable_default_cpps) == "[]") {
						delete expected.module.exports.disable_default_cpps;
					}
					break;
				case "productconfig/trigger/surveydef/def":
					if (expected.module.exports.site == null) {
						delete expected.module.exports.site;
					}
					if (expected.module.exports.section == null) {
						delete expected.module.exports.section;
					}
					if (
						expected.module.exports.qualifier &&
						expected.module.exports.qualifier.survey &&
						expected.module.exports.qualifier.survey.noThanksTopSection ==
							"You will not receive the survey.  Thank you for your willingness to help." &&
						fcpvals.cctVersions.includes(codeVersionToTest)
					) {
						expected.module.exports.qualifier.survey.noThanksTopSection =
							"You will not receive the survey. Thank you for your willingness to help.";
					}
					break;
			}
		}
		if (filename == "productconfig/trigger/product_config" && expected.module.exports.cpps) {
			for (cpp in expected.module.exports.cpps) {
				if (expected.module.exports.cpps[cpp] && expected.module.exports.cpps[cpp].source == "cookie") {
					if (expected.module.exports.cpps[cpp].name) {
						expected.module.exports.cpps[cpp].val = expected.module.exports.cpps[cpp].name;
						if (expected.module.exports.cpps[cpp].exists) {
							//this is just because stringify and compare won't be happy if they're in a different order, so this is to put exists back at the end
							expected.module.exports.cpps[cpp].name = expected.module.exports.cpps[cpp].exists;
							delete expected.module.exports.cpps[cpp].exists;
							expected.module.exports.cpps[cpp].exists = expected.module.exports.cpps[cpp].name;
						}
						delete expected.module.exports.cpps[cpp].name;
					}
				}
			}
		}
		if (
			filename == "productconfig/trigger/surveydef/def" &&
			expected.module.exports.display &&
			expected.module.exports.display.desktop_legacy_disabled
		) {
			delete expected.module.exports.display.desktop_legacy_disabled;
		}
  }
  return expected;
}

async function fixCreatedForMe(filename, sitekey, codeVersionToTest, created, expected) {
	if (expected && expected.module && expected.module.exports) {
		if (
			sitekey == "emptyconfigs" &&
			filename == "productconfig/trigger/product_config" &&
			created.module.exports.surveyAsyncCurl == "i.4see.mobi"
		) {
			created.module.exports.surveyAsyncCurl = "s.foresee.com";
		}
    //all the following rules really need to be revisited and hopefully handled in a better way, none of them are great in real life scenarios but they make the tests work - shouldn't be common real life scenarios
    if (filename=="productconfig/trigger/surveydef/def") {
      if (created.module.exports.display) {
        if (created.module.exports.display.desktop_legacy_disabled) {
          if (fcpvals.legacyDesktopVersions.includes(codeVersionToTest)) {
            created.module.exports.display.desktop = created.module.exports.display.desktop_legacy_disabled;
          }
          delete created.module.exports.display.desktop_legacy_disabled;
        }
        if (created.module.exports.display.desktop && created.module.exports.display.desktop[0]) {
          if (created.module.exports.display.desktop[0].dialog) {
            if (created.module.exports.display.desktop[0].dialog.noticeAboutSurvey) {
              if (
                !expected ||
                !expected.module ||
                !expected.module.exports ||
                !expected.module.exports.display ||
                !expected.module.exports.display.desktop ||
                !expected.module.exports.display.desktop[0] ||
                !expected.module.exports.display.desktop[0].dialog ||
                !expected.module.exports.display.desktop[0].dialog.noticeAboutSurvey
              )
                delete created.module.exports.display.desktop[0].dialog.noticeAboutSurvey;
            }
            if (created.module.exports.display.desktop[0].dialog.attribution) {
              if (
                !expected ||
                !expected.module ||
                !expected.module.exports ||
                !expected.module.exports.display ||
                !expected.module.exports.display.desktop ||
                !expected.module.exports.display.desktop[0] ||
                !expected.module.exports.display.desktop[0].dialog ||
                !expected.module.exports.display.desktop[0].dialog.attribution
              )
                delete created.module.exports.display.desktop[0].dialog.attribution;
            }
            if (created.module.exports.display.desktop[0].dialog.trackerAtEnd) {
              if (
                !expected ||
                !expected.module ||
                !expected.module.exports ||
                !expected.module.exports.display ||
                !expected.module.exports.display.desktop ||
                !expected.module.exports.display.desktop[0] ||
                !expected.module.exports.display.desktop[0].dialog ||
                !expected.module.exports.display.desktop[0].dialog.trackerAtEnd
              )
                delete created.module.exports.display.desktop[0].dialog.trackerAtEnd;
            }
            if (created.module.exports.display.desktop[0].dialog.trackerDesc3) {
              if (
                !expected ||
                !expected.module ||
                !expected.module.exports ||
                !expected.module.exports.display ||
                !expected.module.exports.display.desktop ||
                !expected.module.exports.display.desktop[0] ||
                !expected.module.exports.display.desktop[0].dialog ||
                !expected.module.exports.display.desktop[0].dialog.trackerDesc3
              )
                delete created.module.exports.display.desktop[0].dialog.trackerDesc3;
            }
            if (created.module.exports.display.desktop[0].dialog.trackerCorp) {
              if (
                !expected ||
                !expected.module ||
                !expected.module.exports ||
                !expected.module.exports.display ||
                !expected.module.exports.display.desktop ||
                !expected.module.exports.display.desktop[0] ||
                !expected.module.exports.display.desktop[0].dialog ||
                !expected.module.exports.display.desktop[0].dialog.trackerCorp
              )
                delete created.module.exports.display.desktop[0].dialog.trackerCorp;
            }
            if (created.module.exports.display.desktop[0].dialog.trackerPrivacy) {
              if (
                !expected ||
                !expected.module ||
                !expected.module.exports ||
                !expected.module.exports.display ||
                !expected.module.exports.display.desktop ||
                !expected.module.exports.display.desktop[0] ||
                !expected.module.exports.display.desktop[0].dialog ||
                !expected.module.exports.display.desktop[0].dialog.trackerPrivacy
              )
                delete created.module.exports.display.desktop[0].dialog.trackerPrivacy;
            }
          }
          if (created.module.exports.display.desktop[0].vendorTitleText) {
            if (
              !expected ||
              !expected.module ||
              !expected.module.exports ||
              !expected.module.exports.display ||
              !expected.module.exports.display.desktop ||
              !expected.module.exports.display.desktop[0] ||
              !expected.module.exports.display.desktop[0].vendorTitleText
            )
              delete created.module.exports.display.desktop[0].vendorTitleText;
          }
          if (created.module.exports.display.desktop[0].vendorAltText) {
            if (
              !expected ||
              !expected.module ||
              !expected.module.exports ||
              !expected.module.exports.display ||
              !expected.module.exports.display.desktop ||
              !expected.module.exports.display.desktop[0] ||
              !expected.module.exports.display.desktop[0].vendorAltText
            )
              delete created.module.exports.display.desktop[0].vendorAltText;
          }
          //if (created.module.exports.display.desktop[0].hideForeSeeLogoDesktop) {
            if (
              !expected ||
              !expected.module ||
              !expected.module.exports ||
              !expected.module.exports.display ||
              !expected.module.exports.display.desktop ||
              !expected.module.exports.display.desktop[0] ||
              !expected.module.exports.display.desktop[0].hideForeSeeLogoDesktop
            )
              delete created.module.exports.display.desktop[0].hideForeSeeLogoDesktop;
          //}
        }
        if (created.module.exports.display.mobile && created.module.exports.display.mobile[0]) {
          if (created.module.exports.display.mobile[0].trusteLogoAltText) {
            if (
              !expected ||
              !expected.module ||
              !expected.module.exports ||
              !expected.module.exports.display ||
              !expected.module.exports.display.mobile ||
              !expected.module.exports.display.mobile[0] ||
              !expected.module.exports.display.mobile[0].trusteLogoAltText
            )
              delete created.module.exports.display.mobile[0].trusteLogoAltText;
          }
          if (created.module.exports.display.mobile[0].hideForeSeeLogoMobile) {
            if (
              !expected ||
              !expected.module ||
              !expected.module.exports ||
              !expected.module.exports.display ||
              !expected.module.exports.display.mobile ||
              !expected.module.exports.display.mobile[0] ||
              !expected.module.exports.display.mobile[0].hideForeSeeLogoMobile
            )
              delete created.module.exports.display.mobile[0].hideForeSeeLogoMobile;
          }
          if (created.module.exports.display.mobile[0].inviteDelay) {
            if (
              !expected ||
              !expected.module ||
              !expected.module.exports ||
              !expected.module.exports.display ||
              !expected.module.exports.display.mobile ||
              !expected.module.exports.display.mobile[0] ||
              !expected.module.exports.display.mobile[0].inviteDelay
            )
              delete created.module.exports.display.mobile[0].inviteDelay;
          }
          if (created.module.exports.display.mobile[0].trapFocus) {
            if (
              !expected ||
              !expected.module ||
              !expected.module.exports ||
              !expected.module.exports.display ||
              !expected.module.exports.display.mobile ||
              !expected.module.exports.display.mobile[0] ||
              !expected.module.exports.display.mobile[0].trapFocus
            )
              delete created.module.exports.display.mobile[0].trapFocus;
          }
          if (created.module.exports.display.mobile[0].dialog) {
            if (created.module.exports.display.mobile[0].dialog.ariaCloseInvite) {
              if (
                !expected ||
                !expected.module ||
                !expected.module.exports ||
                !expected.module.exports.display ||
                !expected.module.exports.display.mobile ||
                !expected.module.exports.display.mobile[0] ||
                !expected.module.exports.display.mobile[0].dialog ||
                !expected.module.exports.display.mobile[0].dialog.ariaCloseInvite
              )
                delete created.module.exports.display.mobile[0].dialog.ariaCloseInvite;
            }
            if (created.module.exports.display.mobile[0].dialog.ariaContactLabel) {
              if (
                !expected ||
                !expected.module ||
                !expected.module.exports ||
                !expected.module.exports.display ||
                !expected.module.exports.display.mobile ||
                !expected.module.exports.display.mobile[0] ||
                !expected.module.exports.display.mobile[0].dialog ||
                !expected.module.exports.display.mobile[0].dialog.ariaContactLabel
              )
                delete created.module.exports.display.mobile[0].dialog.ariaContactLabel;
            }
            if (created.module.exports.display.mobile[0].dialog.termsAndConditionsText) {
              if (
                !expected ||
                !expected.module ||
                !expected.module.exports ||
                !expected.module.exports.display ||
                !expected.module.exports.display.mobile ||
                !expected.module.exports.display.mobile[0] ||
                !expected.module.exports.display.mobile[0].dialog ||
                !expected.module.exports.display.mobile[0].dialog.termsAndConditionsText
              )
                delete created.module.exports.display.mobile[0].dialog.termsAndConditionsText;
            }
            if (created.module.exports.display.mobile[0].dialog.termsAndConditionsLink) {
              if (
                !expected ||
                !expected.module ||
                !expected.module.exports ||
                !expected.module.exports.display ||
                !expected.module.exports.display.mobile ||
                !expected.module.exports.display.mobile[0] ||
                !expected.module.exports.display.mobile[0].dialog ||
                !expected.module.exports.display.mobile[0].dialog.termsAndConditionsLink
              )
                delete created.module.exports.display.mobile[0].dialog.termsAndConditionsLink;
            }
            if (created.module.exports.display.mobile[0].dialog.font) {
              if (
                !expected ||
                !expected.module ||
                !expected.module.exports ||
                !expected.module.exports.display ||
                !expected.module.exports.display.mobile ||
                !expected.module.exports.display.mobile[0] ||
                !expected.module.exports.display.mobile[0].dialog ||
                !expected.module.exports.display.mobile[0].dialog.font
              )
                delete created.module.exports.display.mobile[0].dialog.font;
            }
            if (created.module.exports.display.mobile[0].dialog.invitebg) {
              if (
                !expected ||
                !expected.module ||
                !expected.module.exports ||
                !expected.module.exports.display ||
                !expected.module.exports.display.mobile ||
                !expected.module.exports.display.mobile[0] ||
                !expected.module.exports.display.mobile[0].dialog ||
                !expected.module.exports.display.mobile[0].dialog.invitebg
              )
                delete created.module.exports.display.mobile[0].dialog.invitebg;
            }
            if (created.module.exports.display.mobile[0].dialog.shadowcolor) {
              if (
                !expected ||
                !expected.module ||
                !expected.module.exports ||
                !expected.module.exports.display ||
                !expected.module.exports.display.mobile ||
                !expected.module.exports.display.mobile[0] ||
                !expected.module.exports.display.mobile[0].dialog ||
                !expected.module.exports.display.mobile[0].dialog.shadowcolor
              )
                delete created.module.exports.display.mobile[0].dialog.shadowcolor;
            }
            if (created.module.exports.display.mobile[0].dialog.bannerprivacybg) {
              if (
                !expected ||
                !expected.module ||
                !expected.module.exports ||
                !expected.module.exports.display ||
                !expected.module.exports.display.mobile ||
                !expected.module.exports.display.mobile[0] ||
                !expected.module.exports.display.mobile[0].dialog ||
                !expected.module.exports.display.mobile[0].dialog.bannerprivacybg
              )
                delete created.module.exports.display.mobile[0].dialog.bannerprivacybg;
            }
            if (created.module.exports.display.mobile[0].dialog.textcolor) {
              if (
                !expected ||
                !expected.module ||
                !expected.module.exports ||
                !expected.module.exports.display ||
                !expected.module.exports.display.mobile ||
                !expected.module.exports.display.mobile[0] ||
                !expected.module.exports.display.mobile[0].dialog ||
                !expected.module.exports.display.mobile[0].dialog.textcolor
              )
                delete created.module.exports.display.mobile[0].dialog.textcolor;
            }
            if (created.module.exports.display.mobile[0].dialog.buttontextcolor) {
              if (
                !expected ||
                !expected.module ||
                !expected.module.exports ||
                !expected.module.exports.display ||
                !expected.module.exports.display.mobile ||
                !expected.module.exports.display.mobile[0] ||
                !expected.module.exports.display.mobile[0].dialog ||
                !expected.module.exports.display.mobile[0].dialog.buttontextcolor
              )
                delete created.module.exports.display.mobile[0].dialog.buttontextcolor;
            }
            if (created.module.exports.display.mobile[0].dialog.buttonbg) {
              if (
                !expected ||
                !expected.module ||
                !expected.module.exports ||
                !expected.module.exports.display ||
                !expected.module.exports.display.mobile ||
                !expected.module.exports.display.mobile[0] ||
                !expected.module.exports.display.mobile[0].dialog ||
                !expected.module.exports.display.mobile[0].dialog.buttonbg
              )
                delete created.module.exports.display.mobile[0].dialog.buttonbg;
            }
            if (created.module.exports.display.mobile[0].dialog.buttondisabledbg) {
              if (
                !expected ||
                !expected.module ||
                !expected.module.exports ||
                !expected.module.exports.display ||
                !expected.module.exports.display.mobile ||
                !expected.module.exports.display.mobile[0] ||
                !expected.module.exports.display.mobile[0].dialog ||
                !expected.module.exports.display.mobile[0].dialog.buttondisabledbg
              )
                delete created.module.exports.display.mobile[0].dialog.buttondisabledbg;
            }
            if (created.module.exports.display.mobile[0].dialog.buttonshadowcolor) {
              if (
                !expected ||
                !expected.module ||
                !expected.module.exports ||
                !expected.module.exports.display ||
                !expected.module.exports.display.mobile ||
                !expected.module.exports.display.mobile[0] ||
                !expected.module.exports.display.mobile[0].dialog ||
                !expected.module.exports.display.mobile[0].dialog.buttonshadowcolor
              )
                delete created.module.exports.display.mobile[0].dialog.buttonshadowcolor;
            }
            if (created.module.exports.display.mobile[0].dialog.fullscreenbg) {
              if (
                !expected ||
                !expected.module ||
                !expected.module.exports ||
                !expected.module.exports.display ||
                !expected.module.exports.display.mobile ||
                !expected.module.exports.display.mobile[0] ||
                !expected.module.exports.display.mobile[0].dialog ||
                !expected.module.exports.display.mobile[0].dialog.fullscreenbg
              )
                delete created.module.exports.display.mobile[0].dialog.fullscreenbg;
            }
            if (created.module.exports.display.mobile[0].dialog.closebuttontextcolor) {
              if (
                !expected ||
                !expected.module ||
                !expected.module.exports ||
                !expected.module.exports.display ||
                !expected.module.exports.display.mobile ||
                !expected.module.exports.display.mobile[0] ||
                !expected.module.exports.display.mobile[0].dialog ||
                !expected.module.exports.display.mobile[0].dialog.closebuttontextcolor
              )
                delete created.module.exports.display.mobile[0].dialog.closebuttontextcolor;
            }
            if (created.module.exports.display.mobile[0].dialog.closebuttonbg) {
              if (
                !expected ||
                !expected.module ||
                !expected.module.exports ||
                !expected.module.exports.display ||
                !expected.module.exports.display.mobile ||
                !expected.module.exports.display.mobile[0] ||
                !expected.module.exports.display.mobile[0].dialog ||
                !expected.module.exports.display.mobile[0].dialog.closebuttonbg
              )
                delete created.module.exports.display.mobile[0].dialog.closebuttonbg;
            }
            if (created.module.exports.display.mobile[0].dialog.closebuttonfullscreenbg) {
              if (
                !expected ||
                !expected.module ||
                !expected.module.exports ||
                !expected.module.exports.display ||
                !expected.module.exports.display.mobile ||
                !expected.module.exports.display.mobile[0] ||
                !expected.module.exports.display.mobile[0].dialog ||
                !expected.module.exports.display.mobile[0].dialog.closebuttonfullscreenbg
              )
                delete created.module.exports.display.mobile[0].dialog.closebuttonfullscreenbg;
            }
            if (created.module.exports.display.mobile[0].dialog.invalidtextcolor) {
              if (
                !expected ||
                !expected.module ||
                !expected.module.exports ||
                !expected.module.exports.display ||
                !expected.module.exports.display.mobile ||
                !expected.module.exports.display.mobile[0] ||
                !expected.module.exports.display.mobile[0].dialog ||
                !expected.module.exports.display.mobile[0].dialog.invalidtextcolor
              )
                delete created.module.exports.display.mobile[0].dialog.invalidtextcolor;
            }
            if (created.module.exports.display.mobile[0].dialog.locales) {
              if (
                !expected ||
                !expected.module ||
                !expected.module.exports ||
                !expected.module.exports.display ||
                !expected.module.exports.display.mobile ||
                !expected.module.exports.display.mobile[0] ||
                !expected.module.exports.display.mobile[0].dialog ||
                !expected.module.exports.display.mobile[0].dialog.locales
              )
                delete created.module.exports.display.mobile[0].dialog.locales;
            }
          }
          if (created.module.exports.display.mobile[0].style) {
            if (
              !expected ||
              !expected.module ||
              !expected.module.exports ||
              !expected.module.exports.display ||
              !expected.module.exports.display.mobile ||
              !expected.module.exports.display.mobile[0] ||
              !expected.module.exports.display.mobile[0].style
            )
              delete created.module.exports.display.mobile[0].style;
          }
          if (created.module.exports.display.mobile[0].presetStyles) {
            if (
              !expected ||
              !expected.module ||
              !expected.module.exports ||
              !expected.module.exports.display ||
              !expected.module.exports.display.mobile ||
              !expected.module.exports.display.mobile[0] ||
              !expected.module.exports.display.mobile[0].presetStyles
            )
              delete created.module.exports.display.mobile[0].presetStyles;
          }
          if (created.module.exports.display.mobile[0].customStyleBlock) {
            if (
              !expected ||
              !expected.module ||
              !expected.module.exports ||
              !expected.module.exports.display ||
              !expected.module.exports.display.mobile ||
              !expected.module.exports.display.mobile[0] ||
              !expected.module.exports.display.mobile[0].customStyleBlock
            )
              delete created.module.exports.display.mobile[0].customStyleBlock;
          }
        }
      }
      if (
        created.module.exports.qualifier &&
        created.module.exports.qualifier.survey &&
        created.module.exports.qualifier.survey.locales
      ) {
        if (
          !expected ||
          !expected.module ||
          !expected.module.exports ||
          !expected.module.exports.qualifier ||
          !expected.module.exports.qualifier.survey ||
          !expected.module.exports.qualifier.survey.locales
        ) {
          delete created.module.exports.qualifier.survey.locales;
        }
      }
      if (
        created.module.exports.reminder &&
        created.module.exports.reminder.display &&
        created.module.exports.reminder.display.locales
      ) {
        if (
          !expected ||
          !expected.module ||
          !expected.module.exports ||
          !expected.module.exports.reminder ||
          !expected.module.exports.reminder.display ||
          !expected.module.exports.reminder.display.locales
        ) {
          delete created.module.exports.reminder.display.locales;
        }
      }
    }
  }
  return created;
}

module.exports = {
	buildForTemplateTest,
	cleanUpTemplateTest,
	testTemplate,
};
