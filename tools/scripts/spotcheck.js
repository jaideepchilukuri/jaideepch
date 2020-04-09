const filesystem = require("./filesystem"),
	fcp = require("./FCPvals"),
	other = require("./other");

async function findCustomerKeyFromCustomerId(customerId) {
	let customerKey = await other.httpRequest("GET", `https://fsrsupport.foresee.com/api/cust/select?cid=${customerId}`);
	customerKey = JSON.parse(customerKey.getBody("utf8"));
	if (
		customerKey &&
		customerKey.data &&
		customerKey.data.rows &&
		customerKey.data.rows[0] &&
		customerKey.data.rows[0].CUSTOMERKEY
	) {
		return customerKey.data.rows[0].CUSTOMERKEY;
	}
	return null;
}

async function findCustomerIdFromCustomerKey(customerKey) {
	let customerId = await other.httpRequest("GET", `https://fsrsupport.foresee.com/api/cust/select?cid=${customerKey}`);
	customerId = JSON.parse(customerId.getBody("utf8"));
	if (
		customerId &&
		customerId.data &&
		customerId.data.rows &&
		customerId.data.rows[0] &&
		customerId.data.rows[0].CUSTOMERID
	) {
		return customerId.data.rows[0].CUSTOMERID;
	}
	return null;
}

async function findCustomerKeyFromSiteKey(siteKey) {
	let customerKey = await other.httpRequest("GET", `https://fcp.foresee.com/sites/${siteKey}`, {
		headers: {
			authorization: fcp.fcpROCreds,
		},
	});
	customerKey = JSON.parse(customerKey.getBody("utf8"));
	if (customerKey && customerKey.message && customerKey.message[0] && customerKey.message[0].client_id) {
		return customerKey.message[0].client_id;
	}
	return null;
}

async function checkCustomerKey(path) {
	// console.log("Checking Customer Key...");
	let jconfig = await filesystem.readFileToObjectIfExists(path);
	if (!jconfig.global) {
		jconfig.global = {};
	}
	let ckey = null;
	if (jconfig.global.customerKey) {
		ckey = jconfig.global.customerKey;
	}
	if (isNaN(ckey)) {
		ckey = null;
	}
	if (!ckey && jconfig.global.customerId) {
		ckey = await findCustomerKeyFromCustomerId(jconfig.global.customerId);
	}
	if (!ckey) {
		let sitekey = null;
		if (jconfig.global.siteKey) {
			sitekey = jconfig.global.siteKey;
		}
		if (!sitekey) {
			let temp = path.split("/");
			sitekey = temp[temp.length - 2];
		}
		if (sitekey) {
			ckey = await findCustomerKeyFromSiteKey(sitekey);
		}
	}
	if (!ckey) {
		ckey = await other.askQuestion([
			{
				type: "input",
				name: "customerkey",
				message: "Customer key is missing. What is the customer key for this sitekey?",
			},
		]);
		ckey = ckey.customerkey;
	}
	// console.log(ckey)
	jconfig.global.customerKey = ckey;
	jconfig = JSON.stringify(jconfig);
	await filesystem.writeToFile(path, jconfig);
	return;
}

async function checkCodeVersion(path) {
	let sitekey = path.split("/");
	sitekey = sitekey[sitekey.length - 1];
	const ejspath = path.substring(0, path.length - sitekey.length - "clientconfigs/".length) + "EJS";
	// console.log("Checking Code Version...");
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}/config.json`);
	return new Promise(function(resolve, reject) {
		if (!jconfig.global) {
			jconfig.global = {};
		}
		if (!jconfig.global.codeVer) {
			let packagejson = filesystem.readFileToObjectIfExists(`${path}/CC/package.json`);
			if (packagejson && packagejson.version) {
				jconfig.global.codeVer = packagejson.version;
			}
		}
		while (!jconfig.global.codeVer || !filesystem.checkIfFileOrDirExists(`${ejspath}/${jconfig.global.codeVer}`)) {
			let cVer = other.askQuestion([
				{
					type: "input",
					name: "codeVer",
					message:
						"Code version is missing or there's no template to build it. What other code version do you want to build?",
				},
			]).codeVer;
			if (!cVer || cVer == null || cVer == "") {
				return reject(
					`Code Version ${
						jconfig.global.codeVer
					} is not currently supported, unless you just need to fetch in new updates from github. Please reach out to support@foresee.com if you have any questions. Thank you come again.`
				);
			}
			jconfig.global.codeVer = cVer;
		}
		const codeVersion = jconfig.global.codeVer;
		jconfig = JSON.stringify(jconfig);
		filesystem.writeToFile(`${path}/config.json`, jconfig);
		return resolve(codeVersion);
	});
}

async function checkSiteKey(path) {
	// console.log("Checking Site Key...");
	let jconfig = await filesystem.readFileToObjectIfExists(path);
	return new Promise(function(resolve, reject) {
		if (!jconfig.global) {
			jconfig.global = {};
		}
		if (!jconfig.global.siteKey) {
			let skey = path.split("/");
			jconfig.global.siteKey = skey[skey.length - 2];
		}
		jconfig = JSON.stringify(jconfig);
		filesystem.writeToFile(path, jconfig);
		return resolve();
	});
}

async function checkCustomerId(path) {
	// console.log("Checking Customer Id...");
	let jconfig = await filesystem.readFileToObjectIfExists(path);
	return new Promise(function(resolve, reject) {
		if (!jconfig.global) {
			jconfig.global = {};
		}
		let cid = null;
		if (jconfig.global.customerId) {
			cid = jconfig.global.customerId;
		}
		if (!cid && jconfig.global.customerKey) {
			cid = findCustomerIdFromCustomerKey(jconfig.global.customerKey);
		}
		if (!cid) {
			let sitekey = null;
			if (jconfig.global.siteKey) {
				sitekey = jconfig.global.siteKey;
			}
			if (!sitekey) {
				let temp = path.split("/");
				sitekey = temp[temp.length - 2];
			}
			if (sitekey) {
				cid = findCustomerIdFromCustomerKey(findCustomerKeyFromSiteKey(sitekey));
			}
		}
		if (!cid) {
			cid = other.askQuestion([
				{ type: "input", name: "cid", message: "Customer key is missing. What is the customer key for this sitekey?" },
			]).cid;
		}
		jconfig.global.customerId = cid;
		jconfig = JSON.stringify(jconfig);
		filesystem.writeToFile(path, jconfig);
		return resolve();
	});
}

async function checkCPP(path) {
	// console.log("Checking CPPs..");
	let jconfig = await filesystem.readFileToObjectIfExists(path);
	return new Promise(function(resolve, reject) {
		if (jconfig && jconfig.trigger && jconfig.trigger.config && jconfig.trigger.config.cpps) {
			for (cpp in jconfig.trigger.config.cpps) {
				if (jconfig.trigger.config.cpps[cpp].source == "cookie" && jconfig.trigger.config.cpps[cpp].name) {
					jconfig.trigger.config.cpps[cpp].val = jconfig.trigger.config.cpps[cpp].name;
					delete jconfig.trigger.config.cpps[cpp].name;
				}
			}
			jconfig = JSON.stringify(jconfig);
			filesystem.writeToFile(path, jconfig);
		}
		return resolve();
	});
}

async function checkUID(path) {
	//console.log("Checking UIDs..");
	let jconfig = await filesystem.readFileToObjectIfExists(path);
	if (jconfig && jconfig.trigger && jconfig.trigger.surveydefs) {
		let newUID = await other.httpRequest(
			"GET",
			`https://www.uuidgenerator.net/api/version4/${jconfig.trigger.surveydefs.length}`
		);
		newUID = newUID.getBody("utf8");
		for (def of jconfig.trigger.surveydefs) {
			if (!def.uid) {
				// console.log(newUID);
				def["uid"] = newUID.substring(0, 36);
				newUID = newUID.substring(38, newUID.length);
			}
		}
		jconfig = JSON.stringify(jconfig);
		await filesystem.writeToFile(path, jconfig);
	}
	return; // resolve();
}

async function checkLegacyDisplay(path) {
	// await checkCodeVersion(path.substring(0, path.lastIndexOf("/config.json")));
	let jconfig = await filesystem.readFileToObjectIfExists(path);
	let codeVersion = null;
	if (jconfig && jconfig.global && jconfig.global.codeVer) {
		codeVersion = jconfig.global.codeVer;
		//console.log("Checking Displays For Legacy..");
		return new Promise(function(resolve, reject) {
			if (fcp.legacyDesktopVersions.includes(codeVersion)) {
				if (jconfig && jconfig.trigger && jconfig.trigger.surveydefs) {
					for (var def of jconfig.trigger.surveydefs) {
						if (def.criteria.supportsDesktop) {
							if (!def.display) {
								def.display = {};
							}
							if (!def.display.desktop) {
								def.display.desktop = [];
							}
							if (!def.display.desktop[0]) {
								def.display.desktop[0] = {};
							}
							if (!def.display.desktop[0].displayname) {
								def.display.desktop[0].displayname = fcp.legacyDesktopDefaults.displayname;
							}
							if (!def.display.desktop[0].template) {
								def.display.desktop[0].template = fcp.legacyDesktopDefaults.template;
							}
							if (!def.display.desktop[0].vendorTitleText) {
								def.display.desktop[0].vendorTitleText = fcp.legacyDesktopDefaults.vendorTitleText;
							}
							if (!def.display.desktop[0].vendorAltText) {
								def.display.desktop[0].vendorAltText = fcp.legacyDesktopDefaults.vendorAltText;
							}
							if (!def.display.desktop[0].hideForeSeeLogoDesktop) {
								def.display.desktop[0].hideForeSeeLogoDesktop = fcp.legacyDesktopDefaults.hideForeSeeLogoDesktop;
							}
							if (!def.display.desktop[0].dialog) {
								def.display.desktop[0].dialog = {};
							}
							if (!def.display.desktop[0].dialog.blurb) {
								def.display.desktop[0].dialog.blurb = fcp.legacyDesktopDefaults.blurb;
							}
							if (!def.display.desktop[0].dialog.noticeAboutSurvey) {
								def.display.desktop[0].dialog.noticeAboutSurvey = fcp.legacyDesktopDefaults.noticeAboutSurvey;
							}
							if (!def.display.desktop[0].dialog.attribution) {
								def.display.desktop[0].dialog.attribution = fcp.legacyDesktopDefaults.attribution;
							}
							if (!def.display.desktop[0].dialog.trackerTitle) {
								def.display.desktop[0].dialog.trackerTitle = fcp.legacyDesktopDefaults.trackerTitle;
							}
							if (!def.display.desktop[0].dialog.trackerClickToView) {
								def.display.desktop[0].dialog.trackerClickToView = fcp.legacyDesktopDefaults.trackerClickToView;
							}
							if (!def.display.desktop[0].dialog.trackerPlsLeaveOpen) {
								def.display.desktop[0].dialog.trackerPlsLeaveOpen = fcp.legacyDesktopDefaults.trackerPlsLeaveOpen;
							}
							if (!def.display.desktop[0].dialog.trackerAtEnd) {
								def.display.desktop[0].dialog.trackerAtEnd = fcp.legacyDesktopDefaults.trackerAtEnd;
							}
							if (!def.display.desktop[0].dialog.trackerDesc1) {
								def.display.desktop[0].dialog.trackerDesc1 = fcp.legacyDesktopDefaults.trackerDesc1;
							}
							if (!def.display.desktop[0].dialog.trackerDesc2) {
								def.display.desktop[0].dialog.trackerDesc2 = fcp.legacyDesktopDefaults.trackerDesc2;
							}
							if (!def.display.desktop[0].dialog.trackerDesc3) {
								def.display.desktop[0].dialog.trackerDesc3 = fcp.legacyDesktopDefaults.trackerDesc3;
							}
							if (!def.display.desktop[0].dialog.trackerCorp) {
								def.display.desktop[0].dialog.trackerCorp = fcp.legacyDesktopDefaults.trackerCorp;
							}
							if (!def.display.desktop[0].dialog.trackerPrivacy) {
								def.display.desktop[0].dialog.trackerPrivacy = fcp.legacyDesktopDefaults.trackerPrivacy;
							}
						}
					}
					jconfig = JSON.stringify(jconfig);
					filesystem.writeToFile(path, jconfig);
				}
			}
			return resolve(jconfig);
		});
	} else {
		console.log("Code version not defined in config.json. Legacy Desktop Display Template check failed!");
	}
	return;
}

async function checkForCustomTemplates(path) {
	//console.log("Checking Templates For Customs..");
	let jconfig = await filesystem.readFileToObjectIfExists(path);
	let counter = 0;
	if (jconfig && jconfig.trigger && jconfig.trigger.surveydefs) {
		for (var def of jconfig.trigger.surveydefs) {
			if (
				def.display &&
				def.display.desktop &&
				def.display.desktop[0] &&
				def.display.desktop[0].template &&
				def.display.desktop[0].template != "classicdesktop" &&
				def.display.desktop[0].template != "desktopredesign"
			) {
				console.log(
					`WARNING! Def ${counter} has custom desktop template '${def.display.desktop[0].template}'! #DO_SOMETHING!`
				);
			}
			if (
				def.display &&
				def.display.mobile &&
				def.display.mobile[0] &&
				def.display.mobile[0].template &&
				def.display.mobile[0].template != "mobile"
			) {
				console.log(
					`WARNING! Def ${counter} has custom mobile template '${def.display.mobile[0].template}'! #DO_SOMETHING!`
				);
			}
			counter++;
		}
	}
}

async function checkBlacklistFalse(path) {
	//console.log("Checking Record For Blacklist Active Set To False...");
	let jconfig = await filesystem.readFileToObjectIfExists(path);
	return new Promise(function(resolve, reject) {
		if (jconfig && jconfig.record && jconfig.record.blacklist && jconfig.record.blacklist.active == false) {
			console.log("Record Blacklist Active Set To False, Deleting This Blacklist: ", jconfig.record.blacklist);
			delete jconfig.record.blacklist;
			jconfig = JSON.stringify(jconfig);
			filesystem.writeToFile(path, jconfig);
		}
		return resolve();
	});
}

async function checkWhitelistFalse(path) {
	//console.log("Checking Record For Whitelist Active Set To False...");
	let jconfig = await filesystem.readFileToObjectIfExists(path);
	return new Promise(function(resolve, reject) {
		if (jconfig && jconfig.record && jconfig.record.whitelist && jconfig.record.whitelist.active == false) {
			console.log("Record Whitelist Active Set To False, Deleting This Whitelist: ", jconfig.record.whitelist);
			delete jconfig.record.whitelist;
			jconfig = JSON.stringify(jconfig);
			filesystem.writeToFile(path, jconfig);
		}
		return resolve();
	});
}

module.exports = {
	checkCustomerKey,
	checkCodeVersion,
	checkSiteKey,
	checkCustomerId,
	checkCPP,
	checkUID,
	checkLegacyDisplay,
	checkForCustomTemplates,
	checkBlacklistFalse,
	checkWhitelistFalse,
};
