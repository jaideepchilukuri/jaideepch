const spotcheck = require("./spotcheck"),
	filesystem = require("./filesystem"),
	fcp = require("./FCPvals"),
	other = require("./other");
const gitigcontents = `node_modules\r\nCC\r\nEJS\r\n_FCP\r\n`;
let jconfig;

async function upgradeChecks(path) {
	await spotcheck.checkBlacklistFalse(path + `/config.json`);
	await spotcheck.checkWhitelistFalse(path + `/config.json`);
	await spotcheck.checkCPP(path + `/config.json`);
	await spotcheck.checkUID(path + `/config.json`);
	await spotcheck.checkLegacyDisplay(path + `/config.json`);
}

async function installNPM(path) {
	let sitekey = path.split("/");
	sitekey = sitekey[sitekey.length - 1];
	const npmpath = path.substring(0, path.length - sitekey.length - "clientconfigs/".length) + "NPM";
	await filesystem.makeDirIfMissing(npmpath);
	await npmRebuild(path, npmpath);
	console.log("Running npm install to make sure we have all the packages we need...");
	await other.spawnProcess("npm", ["install"], {
		cwd: path + "/CC/",
		stdio: "inherit",
		shell: true,
	});
	await npmStash(path, npmpath);
}

async function fullDefection(path) {
	jconfig = await filesystem.readFileToObjectIfExists(path + "/config.json");
	return new Promise(function(resolve, reject) {
		if (jconfig && jconfig.trigger && jconfig.trigger.surveydefs && jconfig.trigger.surveydefs.length > 0) {
			for (let def of jconfig.trigger.surveydefs) {
				if (def.mouseoff && def.mouseoff.mode) {
					delete def.mouseoff.mode; //because the empty config value is "off" so mouseoff won't collect
				}
				if (def.criteria && def.criteria.sp && def.criteria.sp.reg) {
					delete def.criteria.sp.reg; //because the empty config value is -1 so we won't invite
				}
			}
			jconfig = JSON.stringify(jconfig);
			filesystem.writeToFile(path + "/config.json", jconfig);
			//console.log("Turned off all trigger collection");
		}
		return resolve(true);
	});
}

async function updateToModernInvite(path) {
	jconfig = await filesystem.readFileToObjectIfExists(path + "/config.json");
	return new Promise(function(resolve, reject) {
		if (jconfig && jconfig.trigger && jconfig.trigger.surveydefs && jconfig.trigger.surveydefs.length > 0) {
			for (var def of jconfig.trigger.surveydefs) {
				if (
					def.criteria &&
					def.criteria.supportsDesktop &&
					def.display &&
					def.display.desktop &&
					def.display.desktop[0]
				) {
					if (def.display.desktop[0].displayname == fcp.legacyDesktopDefaults.displayname) {
						delete def.display.desktop[0].displayname;
					}
					if (def.display.desktop[0].template == fcp.legacyDesktopDefaults.template) {
						delete def.display.desktop[0].template;
					}
					if (def.display.desktop[0].vendorTitleText == fcp.legacyDesktopDefaults.vendorTitleText) {
						delete def.display.desktop[0].vendorTitleText;
					}
					if (def.display.desktop[0].vendorAltText == fcp.legacyDesktopDefaults.vendorAltText) {
						delete def.display.desktop[0].vendorAltText;
					}
					if (def.display.desktop[0].hideForeSeeLogoDesktop == fcp.legacyDesktopDefaults.hideForeSeeLogoDesktop) {
						delete def.display.desktop[0].hideForeSeeLogoDesktop;
					}
					if (def.display.desktop[0].dialog) {
						if (def.display.desktop[0].dialog.blurb == fcp.legacyDesktopDefaults.blurb) {
							delete def.display.desktop[0].dialog.blurb;
						}
						if (def.display.desktop[0].dialog.noticeAboutSurvey == fcp.legacyDesktopDefaults.noticeAboutSurvey) {
							delete def.display.desktop[0].dialog.noticeAboutSurvey;
						}
						if (def.display.desktop[0].dialog.attribution == fcp.legacyDesktopDefaults.attribution) {
							delete def.display.desktop[0].dialog.attribution;
						}
						if (def.display.desktop[0].dialog.trackerTitle == fcp.legacyDesktopDefaults.trackerTitle) {
							delete def.display.desktop[0].dialog.trackerTitle;
						}
						if (def.display.desktop[0].dialog.trackerClickToView == fcp.legacyDesktopDefaults.trackerClickToView) {
							delete def.display.desktop[0].dialog.trackerClickToView;
						}
						if (def.display.desktop[0].dialog.trackerPlsLeaveOpen == fcp.legacyDesktopDefaults.trackerPlsLeaveOpen) {
							delete def.display.desktop[0].dialog.trackerPlsLeaveOpen;
						}
						if (def.display.desktop[0].dialog.trackerAtEnd == fcp.legacyDesktopDefaults.trackerAtEnd) {
							delete def.display.desktop[0].dialog.trackerAtEnd;
						}
						if (def.display.desktop[0].dialog.trackerDesc1 == fcp.legacyDesktopDefaults.trackerDesc1) {
							delete def.display.desktop[0].dialog.trackerDesc1;
						}
						if (def.display.desktop[0].dialog.trackerDesc2 == fcp.legacyDesktopDefaults.trackerDesc2) {
							delete def.display.desktop[0].dialog.trackerDesc2;
						}
						if (def.display.desktop[0].dialog.trackerDesc3 == fcp.legacyDesktopDefaults.trackerDesc3) {
							delete def.display.desktop[0].dialog.trackerDesc3;
						}
						if (def.display.desktop[0].dialog.trackerCorp == fcp.legacyDesktopDefaults.trackerCorp) {
							delete def.display.desktop[0].dialog.trackerCorp;
						}
						if (def.display.desktop[0].dialog.trackerPrivacy == fcp.legacyDesktopDefaults.trackerPrivacy) {
							delete def.display.desktop[0].dialog.trackerPrivacy;
						}
					}
					if (JSON.stringify(def.display.desktop[0].dialog) == "{}" || def.display.desktop[0].dialog == undefined) {
						delete def.display.desktop[0].dialog;
					}
					if (JSON.stringify(def.display.desktop[0]) == "{}" || def.display.desktop[0] == undefined) {
						delete def.display.desktop[0];
					}
				}
			}
			jconfig = JSON.stringify(jconfig);
			filesystem.writeToFile(path + "/config.json", jconfig);
		}
		return resolve(true);
	});
}

async function updateCodeVersion(path, codeVersion) {
	jconfig = await filesystem.readFileToObjectIfExists(path + "/config.json");
	return new Promise(function(resolve, reject) {
		if (jconfig) {
			if (!jconfig.global) {
				jconfig.global = {};
			}
			jconfig.global.codeVer = codeVersion;
			jconfig = JSON.stringify(jconfig);
			filesystem.writeToFile(path + "/config.json", jconfig);
			console.log("Updated code version in config.json to " + codeVersion);
		}
		return resolve();
	});
}

async function returnCodeVersion(config) {
	return new Promise(function(resolve, reject) {
		let codeVersion = null;
		if (config && config.global && config.global.codeVer) {
			codeVersion = config.global.codeVer;
		}
		return resolve(codeVersion);
	});
}

async function addEmptyDefs(customObj, emptyObj) {
	let emptyDef = emptyObj.trigger.surveydefs[0];
	emptyObj.trigger.surveydefs = [];
	if (customObj && customObj.trigger && customObj.trigger.surveydefs && customObj.trigger.surveydefs.length > 0) {
		for (var def in customObj.trigger.surveydefs) {
			emptyObj.trigger.surveydefs.push(emptyDef);
		}
	} else {
		emptyObj.trigger.surveydefs.push(emptyDef);
	}
	return emptyObj;
}

async function unbaseDefs(Obj) {
	let retObj = Obj;
	for (var def in retObj.trigger.surveydefs) {
		var tempDef = {};
		eval("tempDef=" + (await other.aTob(retObj.trigger.surveydefs[def])));
		retObj.trigger.surveydefs[def] = tempDef;
	}
	return retObj;
}

async function returnEmptyConfig(codeVersion) {
	let codeVersionWithDashes = codeVersion.replace(/\./g, "-");
	//make the call to the url to retrieve the empty config
	let respbody = await other.httpRequest(
		"GET",
		`https://gateway-elb.foresee.com/sites/emptyconfigs/${codeVersionWithDashes}/config.json`
	);
	respbody = await addEmptyDefs(jconfig, JSON.parse(respbody.getBody("utf8")));
	if (JSON.stringify(respbody.trigger.surveydefs[0]).substring(0, 2) != `{"`) {
		respbody = await unbaseDefs(respbody); // unbase64 the surveydefs
	}
	return respbody;
}

async function returnCombinedConfig(customObj, emptyObj, isSpecialArray) {
	let retObj;
	if (customObj == undefined) {
		retObj = emptyObj;
	} else if (emptyObj == undefined) {
		retObj = customObj;
	} else if (Array.isArray(customObj)) {
		if (isSpecialArray) {
			let retTempObj = [];
			if (customObj.length > 0) {
				for (let counter = 0; counter < customObj.length; counter++) {
					retTempObj[counter] = await returnCombinedConfig(customObj[counter], emptyObj[counter], false);
				}
			}
			retObj = retTempObj;
		} else {
			retObj = customObj;
		}
	} else if (typeof customObj == typeof {}) {
		let retTempObj = {};
		for (let objKey in emptyObj) {
			let specialArr = false;
			if (objKey == "surveydefs" || objKey == "desktop" || objKey == "mobile") {
				specialArr = true;
			}
			let tempObj = await returnCombinedConfig(emptyObj[objKey], customObj[objKey], specialArr);
			if (tempObj != undefined) {
				retTempObj[objKey] = tempObj;
			}
		}
		for (let objKey in customObj) {
			let specialArr = false;
			if (objKey == "surveydefs" || objKey == "desktop" || objKey == "mobile") {
				specialArr = true;
			}
			let tempObj = await returnCombinedConfig(customObj[objKey], emptyObj[objKey], specialArr);
			if (tempObj != undefined) {
				retTempObj[objKey] = tempObj;
			}
		}
		retObj = retTempObj;
	} else {
		retObj = customObj;
	}
	return retObj;
}

async function skCopy(path) {
	let sitekey = path.split("/");
	sitekey = sitekey[sitekey.length - 1];
	console.log(`Checking out sitekey ${sitekey}...`);
	await filesystem.deleteFileOrDirIfExists(path /*, `Found a folder at path, deleting it.`*/);
	try {
		let done = await other.doAGit([
			"ls-remote",
			"--heads",
			"https://github.com/foreseecode/websdk-client-configs.git",
			sitekey,
		]);
		// if branch exists (returned value is not null) clone it, else clone master and create new branch
		if (done) {
			await other.doAGit(["clone", "-b", sitekey, "https://github.com/foreseecode/websdk-client-configs.git", path]);
			console.log("Checked out websdk-client-configs branch named", sitekey);
		} else {
			await other.doAGit(["clone", "https://github.com/foreseecode/websdk-client-configs.git", path]);
			/*await other.spawnProcess("git", [`pull origin ${sitekey}`], {
        cwd: path,
        stdio: "inherit",
        shell: true,
      });*/
			await other.doAGit([`--git-dir=${path}/.git`, "checkout", "-b", sitekey]);
			await other.doAGit([
				`--git-dir=${path}/.git`,
				"push",
				"-u",
				`https://github.com/foreseecode/websdk-client-configs.git/`,
				sitekey,
			]);
			console.log("Created websdk-client-configs branch named", sitekey);
		}
	} catch (err) {
		console.log("This error is from the try catch in the skCopy function in the helpertask.js file", err);
	}
	//rewrite .gitignore file for the new location
	await filesystem.writeToFile(`${path}/.gitignore`, gitigcontents);
}

async function getCustom(path, sitekey, container) {
	console.log(`Getting configs for ${sitekey}'s ${container} container from fcp...`);
	try {
		//make the call to the url to retrieve the empty config
		let respbody = await other.httpRequest(
			"GET",
			`https://fsrsupport.foresee.com/api/JSON/custom?sitekey=${sitekey}&container=${container}`
		);
		await filesystem.makeDirIfMissing(`${path}${sitekey}/_FCP`);
		await filesystem.makeDirIfMissing(`${path}${sitekey}/_FCP/${container}`);
		await filesystem.writeToFile(`${path}${sitekey}/_FCP/${container}/config.json`, respbody.getBody("utf8"));
		await other.spawnProcess("npx", [`prettier --write config.json`], {
			cwd: `${path}${sitekey}/_FCP/${container}/`,
			stdio: "inherit",
			shell: true,
		});
		//make the call to the url to retrieve the whole folder, then unzip and copy logos into local folder to keep
		respbody = await other.httpRequest(
			"GET",
			`https://fcp.foresee.com/sites/${sitekey}/containers/${container}/files`,
			{
				headers: { authorization: fcp.fcpROCreds },
			}
		);
		await filesystem.writeZip(`${path}${sitekey}/_FCP/${container}/assets.zip`, respbody.getBody(null));
		await filesystem.unzipAssets(`${path}${sitekey}/_FCP/${container}/assets`);
		await filesystem.deleteFileOrDirIfExists(`${path}${sitekey}/_FCP/${container}/assets.zip`);
		return true;
	} catch (err) {
		console.log(
			`Are you SURE that ${sitekey} has a ${container} container in fcp?`,
			"Got this error trying to get configs from fcp:\n",
			err.message
		);
	}
}

async function copyCustom(path, sitekey, container) {
	sitekey = sitekey[0];
	container = container.toLowerCase();
	await filesystem.deleteFileOrDirIfExists(`${path}${sitekey}/_FCP/${container}`);
	await getCustom(path, sitekey, container);
	await filesystem.copyFrom2ToIfFromExists(
		`${path}${sitekey}/_FCP/${container}/config.json`,
		`${path}${sitekey}/config.json`
	);
	await filesystem.copyFrom2ToIfFromExists(`${path}${sitekey}/_FCP/${container}/assets`, `${path}${sitekey}/assets`);
}

async function ccCopy(path) {
	let sitekey = path.split("/");
	sitekey = sitekey[sitekey.length - 1];
	const cctpath = path.substring(0, path.length - sitekey.length - "clientconfigs/".length) + "CCT";
	await filesystem.deleteFileOrDirIfExists(path + "/CC");
	jconfig = await filesystem.readFileToObjectIfExists(`${path}/config.json`);
	let codeVersion = await returnCodeVersion(jconfig);
	if (codeVersion == null) {
		return reject("Code Version not defined in config.json > global > codeVer");
	}
	await filesystem.makeDirIfMissing(cctpath);
	let copied = await filesystem.copyFrom2ToIfFromExists(
		`${cctpath}/${codeVersion}`,
		`${path}/CC`,
		`Have client code template for ${codeVersion} stashed, copying it over...`
	);
	if (!copied) {
		let repoUrl = "https://github.com/foreseecode/client_code.git";
		// should come back and fix this to use semVer https://www.npmjs.com/package/semver
		if (fcp.cctVersions.includes(codeVersion)) {
			repoUrl = "https://github.com/foreseecode/client_code_template.git";
		}
		//console.log("Copying Code Version", codeVersion, "from Repo Url", repoUrl);
		await filesystem.deleteFileOrDirIfExists(`${path}/CC`);
		await filesystem.makeDirIfMissing(`${path}/CC`);
		await other.doAGit(["clone", "-b", codeVersion, repoUrl, `${path}/CC`]);
	}
	await filesystem.copyFrom2ToIfToMissing(
		`${path}/CC`,
		`${cctpath}/${codeVersion}`,
		`Going to stash client code template for ${codeVersion} because you don't have it. This will save you time in the future, but may take a moment...`
	);
	return;
}

/**
 * Copies assets from top level folder
 */
async function assetsCopy(path) {
	// await filesystem.deleteFileOrDirIfExists(path + "/CC/clientconfig/productconfig/trigger/assets/*", "deleteeeeee");
	await filesystem.copyFrom2ToIfFromExists(path + "/assets", path + "/CC/clientconfig/productconfig/trigger/assets/");
	return;
}

async function configRebuild(path) {
	console.log("Rebuilding config files...");
	let sitekey = path.split("/");
	sitekey = sitekey[sitekey.length - 1];
	const ejspath = path.substring(0, path.length - sitekey.length - "clientconfigs/".length) + "EJS";
	const fcppath = path.substring(0, path.length - sitekey.length - "clientconfigs/".length) + "FCP";
	jconfig = await filesystem.readFileToObjectIfExists(path + "/config.json");
	if (
		jconfig &&
		jconfig.trigger &&
		jconfig.trigger.surveydefs &&
		JSON.stringify(jconfig.trigger.surveydefs[0]).substring(0, 2) != `{"`
	) {
		jconfig = await unbaseDefs(jconfig); // unbase64 the surveydefs
	}
	// console.log("CustomConfig:", jconfig);
	let codeVersion = await returnCodeVersion(jconfig);
	let econfig = await returnEmptyConfig(codeVersion);
	// console.log("EmptyConfig:", econfig);
	let combinedconfig = await returnCombinedConfig(jconfig, econfig, false);
	// console.log("Combined config defs:", combinedconfig.trigger.surveydefs);
	// then the logic to rebuild from that into the actual files
	await filesystem.writeToFile(
		path + "/CC/clientconfig/client_properties.js",
		await filesystem.buildFileContentsFromTemplateFile(`${ejspath}/${codeVersion}/client_properties.ejs`, {
			combinedconfig: combinedconfig,
		})
	);
	await filesystem.writeToFile(
		path + "/CC/clientconfig/productconfig/record/product_config.js",
		await filesystem.buildFileContentsFromTemplateFile(`${ejspath}/${codeVersion}/record_productconfig.ejs`, {
			combinedconfig: combinedconfig,
		})
	);
	await filesystem.writeToFile(
		path + "/CC/clientconfig/productconfig/trigger/product_config.js",
		await filesystem.buildFileContentsFromTemplateFile(`${ejspath}/${codeVersion}/trigger_productconfig.ejs`, {
			combinedconfig: combinedconfig,
		})
	);
	for (var def in combinedconfig.trigger.surveydefs) {
		let tempstring = "0";
		if (def < 10) {
			tempstring = "00";
		}
		await filesystem.writeToFile(
			path + `/CC/clientconfig/productconfig/trigger/surveydef/def${tempstring}${def}.js`,
			await filesystem.buildFileContentsFromTemplateFile(`${ejspath}/${codeVersion}/surveydef.ejs`, {
				surveydef: combinedconfig.trigger.surveydefs[def],
			})
		);
	}
	await filesystem.deleteFileOrDirIfExists(path + "/CC/clientconfig/productconfig/trigger/surveydef/def0.js");
	await filesystem.deleteFileOrDirIfExists(path + "/CC/clientconfig/productconfig/trigger/surveydef/def1.js");
	await prettifyCC(path);
	if (await filesystem.checkIfFileOrDirExists(`${ejspath}/${codeVersion}/globalconfig_local.ejs`)) {
		await filesystem.writeToFile(
			path + "/CC/clientconfig/globalconfig/local.js",
			await filesystem.buildFileContentsFromTemplateFile(`${ejspath}/${codeVersion}/globalconfig_local.ejs`, {
				combinedconfig: combinedconfig,
			})
		);
	}
	if (await filesystem.checkIfFileOrDirExists(`${ejspath}/${codeVersion}/fbmods_productconfig.ejs`)) {
		await filesystem.writeToFile(
			path + "/CC/clientconfig/productconfig/fbmods/product_config.js",
			await filesystem.buildFileContentsFromTemplateFile(`${ejspath}/${codeVersion}/fbmods_productconfig.ejs`, {
				fbmods: combinedconfig.fbmods,
			})
		);
	}
	await filesystem.copyFrom2ToIfFromExists(`${fcppath}/${codeVersion}/gulpfile.js`, path + `/CC/gulpfile.js`);
	await filesystem.copyFrom2ToIfFromExists(`${fcppath}/${codeVersion}/FCP.js`, path + `/CC/scripts/FCP.js`);
	return "done";
}

async function npmRebuild(path, npmpath) {
	jconfig = await filesystem.readFileToObjectIfExists(path + "/config.json");
	let codeVersion = await returnCodeVersion(jconfig);
	await filesystem.copyFrom2ToIfFromExists(
		`${npmpath}/${codeVersion}`,
		path + "/CC/node_modules",
		`Have node modules folder for ${codeVersion} stashed, coping it over. This may take a few moments...`
	);
	return "done";
}

async function npmStash(path, npmpath) {
	jconfig = await filesystem.readFileToObjectIfExists(path + "/config.json");
	let codeVersion = await returnCodeVersion(jconfig);
	await filesystem.copyFrom2ToIfToMissing(
		path + "/CC/node_modules",
		`${npmpath}/${codeVersion}`,
		`Going to stash node modules folder for ${codeVersion} because you don't have it. This will save you time in the future, but may take a few moments...`
	);
	return "done";
}

async function deleteBranch(path) {
	return await filesystem.deleteFileOrDirIfExists(path);
}

async function pushCxSuiteConfigsToDevContainer(path, loginFile) {
	let sitekey = path.split("/");
	sitekey = sitekey[sitekey.length - 1];
	const clientconfigspath = path.substring(0, path.length - sitekey.length);
	await spotcheck.checkCustomerKey(path + "/config.json");
	await spotcheck.checkCodeVersion(path);
	await spotcheck.checkSiteKey(path + "/config.json");
	await spotcheck.checkCustomerId(path + "/config.json");
	let jconfig = await filesystem.readFileToObjectIfExists(path + "/config.json");
	if (!jconfig) {
		return error(`Your path ${path} isn't valid...`);
	}
	let cxsConfig = fcp.cxsDefaultConfig;
	cxsConfig.clientId = jconfig.global.customerKey;
	cxsConfig.siteKey = jconfig.global.siteKey;
	cxsConfig.codeVer = jconfig.global.codeVer;
	cxsConfig.customerId = jconfig.global.customerId;
	//would be easy to add a line here to push other containers... cxsConfig.containerId = whatever , you'd just have to pass in whatever as a value
	cxsConfig = JSON.stringify(cxsConfig);
	await filesystem.makeDirIfMissing(clientconfigspath);
	await filesystem.makeDirIfMissing(`${clientconfigspath}_globalconfigs`);
	await filesystem.writeToFile(`${clientconfigspath}_globalconfigs/${jconfig.global.siteKey}.js`, cxsConfig);
	let savedLogins = await filesystem.readFileToObjectIfExists(loginFile);
	if (savedLogins == undefined) {
		savedLogins = {};
	}
	let un = savedLogins.FCP_USERNAME;
	let unpw = await other.askQuestion([
		{
			type: "input",
			name: "un",
			message: "What is your username for fcp(aws)?",
			default: function() {
				if (un) {
					return un;
				}
				return;
			},
		},
		{ type: "password", name: "pw", message: "What is your password for fcp(aws)?", mask: "*" },
	]);
	if (!un) {
		un = unpw.un;
		savedLogins.FCP_USERNAME = un;
		await filesystem.writeToFile(loginFile, savedLogins);
		await other.spawnProcess("npx", [`prettier --write env.json`], {
			cwd: loginFile.substring(0, loginFile.length - "env.json".length),
			stdio: "inherit",
			shell: true,
		});
	}
	unpw = un + "@aws.foreseeresults.com:" + unpw.pw;
	await other.multipartPost(
		`https://${unpw}@fcp.foresee.com/sites/${jconfig.global.siteKey}/containers/development/configs`,
		`Pushing cxSuite global config values to container development of sitekey ${jconfig.global.siteKey} for testing`,
		`${clientconfigspath}_globalconfigs/${jconfig.global.siteKey}.js`
	);
	await filesystem.deleteFileOrDirIfExists(`${clientconfigspath}_globalconfigs/${jconfig.global.siteKey}.js`);
	console.log(`Pushed globalconfigs to container development of sitekey ${jconfig.global.siteKey}`);
	return true;
}

async function prettifyCC(path) {
	console.log("Prettyifying config files...");
	await other.spawnProcess("npx", [`prettier --write clientconfig/client_properties.js`], {
		cwd: path + "/CC/",
		stdio: "inherit",
		shell: true,
	});
	await other.spawnProcess("npx", [`prettier --write clientconfig/productconfig/record/product_config.js`], {
		cwd: path + "/CC/",
		stdio: "inherit",
		shell: true,
	});
	await other.spawnProcess("npx", [`prettier --write clientconfig/productconfig/trigger/product_config.js`], {
		cwd: path + "/CC/",
		stdio: "inherit",
		shell: true,
	});
	await other.spawnProcess("npx", [`prettier --write clientconfig/productconfig/trigger/surveydef/*`], {
		cwd: path + "/CC/",
		stdio: "inherit",
		shell: true,
	});
}

async function commitAndPushToGithub(path, loginFile) {
	let sitekey = path.split("/");
	sitekey = sitekey[sitekey.length - 1];
	//await other.doAGit([`--git-dir=${path}/.git`, "add", "."]);
	await other.spawnProcess("git", [`add .`], {
		cwd: path,
		stdio: "inherit",
		shell: true,
	});
	let commitmessage = await other.askQuestion([
		{ type: "input", name: "commitmessage", message: "What changes are you committing?" },
	]);
	commitmessage = commitmessage.commitmessage;
	// await other.doAGit([`--git-dir=${path}/.git`, "commit", "-m", `${commitmessage}`]);
	await other.spawnProcess("git", [`commit -m ${commitmessage}`], {
		cwd: path,
		stdio: "inherit",
		shell: true,
	});
	/*let committed = await other.doAGit([
    `--git-dir=${path}/.git`,
    "push",
    `https://github.com/foreseecode/websdk-client-configs.git/`,
  ]);
  if (committed == null) {
    console.log("Committed changes on " + sitekey + " back to repo");
  }*/
	let savedLogins = await filesystem.readFileToObjectIfExists(loginFile);
	if (savedLogins == undefined) {
		savedLogins = {};
	}
	let un = savedLogins.GH_USERNAME;
	let unpw = await other.askQuestion([
		{
			type: "input",
			name: "un",
			message: "What is your username for github?",
			default: function() {
				if (un) {
					return un;
				}
				return;
			},
		},
		{ type: "password", name: "pw", message: "What is your password for github?", mask: "*" },
	]);
	if (!un) {
		un = unpw.un;
		savedLogins.GH_USERNAME = un;
		await filesystem.writeToFile(loginFile, savedLogins);
		await other.spawnProcess("npx", [`prettier --write env.json`], {
			cwd: loginFile.substring(0, loginFile.length - "env.json".length),
			stdio: "inherit",
			shell: true,
		});
	}
	unpw = un + ":" + unpw.pw;
	let committed = await other.spawnProcess(
		"git",
		[`push https://${unpw}@github.com/foreseecode/websdk-client-configs.git/`],
		{
			cwd: path,
			stdio: "inherit",
			shell: true,
		}
	);
	if (committed == 0) {
		console.log("Committed changes on " + sitekey + " back to repo");
	}
	let commitnum = await other.doAGit([`--git-dir=${path}/.git`, "log", "--pretty=%h", "-1"]);
	let ticketnum = NaN;
	while (isNaN(ticketnum)) {
		ticketnum = await other.askQuestion([
			{
				type: "number",
				name: "ticketnum",
				message: "What ticket number in SalesForce is this for? (Please enter the case number)",
			},
		]);
		ticketnum = ticketnum.ticketnum;
	}
	console.log(
		`Pushed ${sitekey} to github. Please paste this in as your fcp push comment: SF Ticket#: ${ticketnum}  Git Commit: ${commitnum}`
	);
	return true;
}

module.exports = {
	upgradeChecks,
	installNPM,
	returnCodeVersion,
	updateCodeVersion,
	updateToModernInvite,
	fullDefection,
	skCopy,
	getCustom,
	copyCustom,
	ccCopy,
	npmRebuild,
	npmStash,
	configRebuild,
	assetsCopy,
	prettifyCC,
	pushCxSuiteConfigsToDevContainer,
	deleteBranch,
	commitAndPushToGithub,
};
