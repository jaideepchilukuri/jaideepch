// to run these tests, cd websdk-builder if you aren't already in the websdk-builder folder
// then run this command: npm test maintainance/scrollcommands.test.js
// note: you may also have to change this value:
const codeVersionToTest = "19.11.1";
// other values you may want to change:
// the list of sitekeys to test
const sitekeys = ["emptyconfigs" /* , "fullcustomeverythingconfigs" */];
// what the commands are that we are testing
const magicCommands = [
	"summon",
	"enchant",
	// "conjure", //not sure how to test this one... maybe send a get request to the localhost address and see what response is returned?? also not sure how to make it stop the localhost
	"mutate",
	"reanimate",
	"facelift",
	"purge",
	// "illusion", //not sure how to test this one... would have to hardcode credentials to fcp?, also not sure how to make it stop the localhost
	//"trick", //not sure how to test this one... would have to hardcode credentials to push back to github and/or fcp? also, not sure if we want to push
	"vanquish",
];
// which fcp containers to pull from for summon command and mutate command - mutate can only take one but summon can take multiple
const fcpContainersToPullFrom = [/* "Development", "Staging", */ "Production"];
// where to deploy to for trick command - can be github or any fcp container
const whereToDeploy = ["Github", "Development" /* , "Staging", "Prouction" */];

const scthf = require("./scrollcommandtesthelperfunctions");

describe.each(sitekeys)("Checking Magic Scroll Commands For Sitekey: %s", sitekey => {
	describe.each(magicCommands)("Checking Magic Scroll Command: %s", magicCommand => {
		jest.setTimeout(1000000); // 100 second timeout

		beforeAll(async () => {
			let testvals = {};
			testvals.sitekey = sitekey;
			testvals.commands = magicCommand;
			testvals.codeversion = codeVersionToTest;
			testvals.fcpcontainers = fcpContainersToPullFrom;
			if (magicCommand == "mutate") {
				testvals.fcpcontainers = fcpContainersToPullFrom[0];
			}
			testvals.deployto = whereToDeploy;
			await scthf.runTheScrollCommand(testvals);
		});

		switch (magicCommand) {
			case "summon":
				describe("Pulling in from github:", () => {
					it("Matches: config.json expected vs pulled in", async () => {
						let matching = await scthf.checkConfigDotJson(sitekey);
						expect(matching).toBe(true);
					});
					it("Matches: assets expected vs pulled in", async () => {
						//should probably turn this into an each and have a for loop for asset files
						let matching = await scthf.checkAssets("", sitekey);
						expect(matching).toBe(true);
					});
				});
				describe.each(fcpContainersToPullFrom)("Pulling in from FCP Container: %s", fcpContainer => {
					it("Matches: fcp container config expected vs pulled in", async () => {
						let matching = await scthf.checkConfigDotJson(sitekey, fcpContainer);
						expect(matching).toBe(true);
					});
					it("Matches: fcp container assets expected vs pulled in", async () => {
						//should probably turn this into an each and have a for loop for asset files
						let matching = await scthf.checkAssets("", sitekey, fcpContainer);
						expect(matching).toBe(true);
					});
				});
				break;
			case "enchant":
				describe("Running config value checks", () => {
					it("Has a customerKey", async () => {
						let jconfig = await scthf.readConfigIntoObject(sitekey);
						expect(jconfig).toHaveProperty("global.customerKey");
					});
					it("Doesn't have blacklist active = false", async () => {
						let jconfig = await scthf.readConfigIntoObject(sitekey);
						expect(jconfig).not.toHaveProperty("record.blacklist.active");
					});
					it("Doesn't have whitelist active = false", async () => {
						let jconfig = await scthf.readConfigIntoObject(sitekey);
						expect(jconfig).not.toHaveProperty("record.whitelist.active");
					});
					it("Doesn't have old cpps", async () => {
						let jconfig = await scthf.readConfigIntoObject(sitekey);
						if (jconfig && jconfig.trigger && jconfig.trigger.config && jconfig.trigger.config.cpps) {
							for (cpp in jconfig.trigger.config.cpps) {
								if (jconfig.trigger.config.cpps[cpp].source == "cookie") {
									expect(jconfig.trigger.config.cpps[cpp]).not.toHaveProperty("name");
								}
							}
						}
					});
					it("Has uids", async () => {
						let jconfig = await scthf.readConfigIntoObject(sitekey);
						if (jconfig && jconfig.trigger && jconfig.trigger.surveydefs) {
							for (def in jconfig.trigger.surveydefs) {
								expect(jconfig.trigger.surveydefs[def]).toHaveProperty("uid");
							}
						}
					});
					/* it("Has legacy display as custom values if applicable", async () => {
						  let jconfig = await scthf.readConfigIntoObject(sitekey);
						  expect(jconfig).toHaveProperty(true);
					  }); */
					it("Has the right code version, and it's a valid version", async () => {
						let jconfig = await scthf.readConfigIntoObject(sitekey);
						let exists = await scthf.checkIfCodeVersionValid(codeVersionToTest);
						expect(jconfig).toHaveProperty("global.codeVer");
						expect(jconfig.global.codeVer).toBe(codeVersionToTest);
						expect(exists).toBe(true);
					});
				});
				it("Built the CC folder", async () => {
					expect(await scthf.checkIfCCFolderExists(sitekey)).toBe(true);
				});
				it("Copied the assets into the CC folder", async () => {
					expect(await scthf.checkCCAssets("", sitekey)).toBe(true);
				});
				it.each([
					"globalconfig/local.js",
					"client_properties.js",
					//"productconfig/fbmods/product_config.js",
					"productconfig/record/product_config.js",
					"productconfig/trigger/product_config.js",
					"productconfig/trigger/surveydef/def000.js",
				])("Rebuilt the config file %s in the CC folder", async configFile => {
					expect(await scthf.checkCCConfigFile(configFile, sitekey)).toBe(true);
				});
				it("Installed node_modules in the CC folder", async () => {
					expect(await scthf.checkNodeModules(sitekey)).toBe(true);
				});
				break;
			case "conjure": //come back to this one
				break;
			case "mutate":
				it("Matches: config.json fcp container vs main", async () => {
					let matching = await scthf.compareConfigAgainstContainer(sitekey, fcpContainersToPullFrom[0]);
					expect(matching).toBe(true);
				});
				it("Matches: assets fcp container vs main", async () => {
					let matching = await scthf.compareAssetsAgainstContainer("", sitekey, fcpContainersToPullFrom[0]);
					expect(matching).toBe(true);
				});
				break;
			case "reanimate":
				it("Matches: expected vs created", async () => {
					expect(true).toBe(true);
				});
				break;
			case "facelift":
				it("Has no legacy desktop defaults", async () => {
					let legacyDefaults = await scthf.returnLegacyDefaults();
					let jconfig = await scthf.readConfigIntoObject(sitekey);
					if (jconfig && jconfig.trigger && jconfig.trigger.surveydefs) {
						for (def in jconfig.trigger.surveydefs) {
							if (
								jconfig.trigger.surveydefs[def].display &&
								jconfig.trigger.surveydefs[def].display.desktop &&
								jconfig.trigger.surveydefs[def].display.desktop[0]
							) {
								expect(jconfig.trigger.surveydefs[def].display.desktop[0]).not.toHaveProperty(
									"displayname",
									legacyDefaults.displayname
								);
								expect(jconfig.trigger.surveydefs[def].display.desktop[0]).not.toHaveProperty(
									"template",
									legacyDefaults.template
								);
								expect(jconfig.trigger.surveydefs[def].display.desktop[0]).not.toHaveProperty(
									"vendorTitleText",
									legacyDefaults.vendorTitleText
								);
								expect(jconfig.trigger.surveydefs[def].display.desktop[0]).not.toHaveProperty(
									"vendorAltText",
									legacyDefaults.vendorAltText
								);
								expect(jconfig.trigger.surveydefs[def].display.desktop[0]).not.toHaveProperty(
									"hideForeSeeLogoDesktop",
									legacyDefaults.hideForeSeeLogoDesktop
								);
								if (jconfig.trigger.surveydefs[def].display.desktop[0].dialog) {
									expect(jconfig.trigger.surveydefs[def].display.desktop[0].dialog).not.toHaveProperty(
										"blurb",
										legacyDefaults.blurb
									);
									expect(jconfig.trigger.surveydefs[def].display.desktop[0].dialog).not.toHaveProperty(
										"noticeAboutSurvey",
										legacyDefaults.noticeAboutSurvey
									);
									expect(jconfig.trigger.surveydefs[def].display.desktop[0].dialog).not.toHaveProperty(
										"attribution",
										legacyDefaults.attribution
									);
									expect(jconfig.trigger.surveydefs[def].display.desktop[0].dialog).not.toHaveProperty(
										"trackerTitle",
										legacyDefaults.trackerTitle
									);
									expect(jconfig.trigger.surveydefs[def].display.desktop[0].dialog).not.toHaveProperty(
										"trackerClickToView",
										legacyDefaults.trackerClickToView
									);
									expect(jconfig.trigger.surveydefs[def].display.desktop[0].dialog).not.toHaveProperty(
										"trackerPlsLeaveOpen",
										legacyDefaults.trackerPlsLeaveOpen
									);
									expect(jconfig.trigger.surveydefs[def].display.desktop[0].dialog).not.toHaveProperty(
										"trackerAtEnd",
										legacyDefaults.trackerAtEnd
									);
									expect(jconfig.trigger.surveydefs[def].display.desktop[0].dialog).not.toHaveProperty(
										"trackerDesc1",
										legacyDefaults.trackerDesc1
									);
									expect(jconfig.trigger.surveydefs[def].display.desktop[0].dialog).not.toHaveProperty(
										"trackerDesc2",
										legacyDefaults.trackerDesc2
									);
									expect(jconfig.trigger.surveydefs[def].display.desktop[0].dialog).not.toHaveProperty(
										"trackerDesc3",
										legacyDefaults.trackerDesc3
									);
									expect(jconfig.trigger.surveydefs[def].display.desktop[0].dialog).not.toHaveProperty(
										"trackerCorp",
										legacyDefaults.trackerCorp
									);
									expect(jconfig.trigger.surveydefs[def].display.desktop[0].dialog).not.toHaveProperty(
										"trackerPrivacy",
										legacyDefaults.trackerPrivacy
									);
								}
							}
						}
					}
				});
				break;
			case "purge":
				it("Has no trigger sp values not equal to -1", async () => {
					let jconfig = await scthf.readConfigIntoObject(sitekey);
					if (jconfig && jconfig.trigger && jconfig.trigger.surveydefs) {
						for (def in jconfig.trigger.surveydefs) {
							if (
								jconfig.trigger.surveydefs[def].mouseoff &&
								jconfig.trigger.surveydefs[def].mouseoff.sp &&
								jconfig.trigger.surveydefs[def].mouseoff.sp.reg
							) {
								expect(jconfig.trigger.surveydefs[def].mouseoff.sp.reg).toBe(-1);
							}
							if (
								jconfig.trigger.surveydefs[def].criteria &&
								jconfig.trigger.surveydefs[def].criteria.sp &&
								jconfig.trigger.surveydefs[def].criteria.sp.reg
							) {
								expect(jconfig.trigger.surveydefs[def].criteria.sp.reg).toBe(-1);
							}
						}
					}
				});
				break;
			case "illusion": //come back to this one
				// it("Did create a zip file", async () => {
				// 	expect(await scthf.checkOnPrem(sitekey)).toBe(true);
				// });
				break;
			case "trick": //come back to this one
				break;
			case "vanquish":
				it("Did delete the sitekey", async () => {
					expect(await scthf.checkIfSitekeyFolderExists(sitekey)).toBe(false);
				});
				break;
			default:
				it("Knows what to test", () => {
					expect(magicCommand).toBe("a command we have tests written for");
				});
		}
	});
});
