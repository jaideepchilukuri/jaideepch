var sitekeyList = [];

const containerList = [
  // "Development",
  // "Staging",
  "Production"
];

const weWantToDeleteOldFcpConfigs = false;

const runSelectedQueriesOnly = true;
const onlyRunTheseQueries = [
  "storageNotCookie"
];

const filesystem = require("./filesystem"),
  fcp = require("./FCPvals"),
  helpertasks = require("./helpertasks"),
  other = require("./other");

const path =
	process.cwd().substr(process.cwd().length - 15, 15) == "\\websdk-builder" || "/websdk-builder"
		? `${process.cwd()}/clientwholejsons/`
  : `${process.cwd()}/websdk-builder/clientwholejsons/`;

const returnListThings = [];
const returnListArrays = {};
const returnListMessages = {};
const returnListFunctions = {};

module.exports = {
  checkAllTheSitekeys: async function () {
    // if you only want to run the queries in onlyRunTheseQueries
    if(runSelectedQueriesOnly && onlyRunTheseQueries.length > 0) {
      while(returnListThings.length > 0) {
        returnListThings.shift();
      }
      for(queryNum in onlyRunTheseQueries) {
        returnListThings.push(onlyRunTheseQueries[queryNum])
      }
    }

    if(weWantToDeleteOldFcpConfigs) {
      await filesystem.deleteFileOrDirIfExists(path)
    }
    await pullInAllTheSitekeys();
    console.log(sitekeyList.length,"Sitekeys currently in production FCP")
    for (container in containerList) {
      for (sitekey in sitekeyList) {
        for (thing in returnListThings) {
          let addSitekeyToThisList = await returnListFunctions[returnListThings[thing]](sitekeyList[sitekey],containerList[container]);
          if(addSitekeyToThisList) {
            returnListArrays[returnListThings[thing]].push(sitekeyList[sitekey]);
          }
        }
      }
      // Now print everything out and clear out the arrays so we can start fresh on the next container
      for (thing in returnListThings) {
        console.log(`Sitekeys with ${returnListMessages[returnListThings[thing]]} in the ${containerList[container]} container:`);
        console.log(returnListArrays[returnListThings[thing]].length,JSON.stringify(returnListArrays[returnListThings[thing]]));
        returnListArrays[returnListThings[thing]] = [];
      }
    }
  }
}
  
async function getAllSitekeysFromFCP() {
	try {
		//make the call to the url to retrieve the list of all sites
		let respbody = await other.httpRequest("GET", `https://fcp.foresee.com/sites/`, {
      headers: {
        authorization: fcp.fcpROCreds,
      },
    });
    respbody = JSON.parse(respbody.getBody("utf8"));
    let sitekeysFromFCP = [];
    for (site in respbody.message) {
      sitekeysFromFCP.push(respbody.message[site].name)
    }
    sitekeyList = sitekeyList.concat(sitekeysFromFCP);
    if(sitekeyList === []) {
      console.log("Nothing pulled in from FCP call, going with the old outdated sitekey list...")
      sitekeyList = fcp.oldSitekeyList;
    }
    // console.log(sitekeyList)
		return true;
	} catch (err) {
		console.log(
			`Are you SURE that you're connected to the internet?`,
			"Got this error trying to get list of sites from fcp:\n",
			err.message
		);
    console.log("Since nothing was pulled in from FCP call, going with the old outdated sitekey list...")
    sitekeyList = fcp.oldSitekeyList;
  }
}
	
async function getConfigJson(path, sitekey, container) {
	console.log(`Getting whole config.json for ${sitekey}'s ${container} container from fcp...`);
	try {
		//make the call to the url to retrieve the whole config.json
		let respbody = await other.httpRequest(
			"GET",
			`https://gateway-elb.foresee.com/sites/${sitekey}/${container}/config.json`
    );
    respbody = JSON.parse(respbody.getBody("utf8"));
    if (
      respbody &&
      respbody.trigger &&
      respbody.trigger.surveydefs &&
      respbody.trigger.surveydefs.length > 0 &&
      JSON.stringify(respbody.trigger.surveydefs[0]).substring(0, 2) != `{"`
    ) {
      respbody = await helpertasks.unbaseDefs(respbody); // unbase64 the surveydefs
    }
		await filesystem.makeDirIfMissing(`${path}`);
		await filesystem.makeDirIfMissing(`${path}${sitekey}`);
		await filesystem.makeDirIfMissing(`${path}${sitekey}`);
		await filesystem.makeDirIfMissing(`${path}${sitekey}/${container}`);
		await filesystem.writeToFile(`${path}${sitekey}/${container}/config.json`, respbody);
		await other.spawnProcess("npx", [`prettier --write config.json`], {
			cwd: `${path}${sitekey}/${container}/`,
			stdio: "inherit",
			shell: true,
		});
		return true;
	} catch (err) {
		console.log(
			`Are you SURE that ${sitekey} has a ${container} container in fcp?`,
			"Got this error trying to get config.json from fcp:\n",
			err.message
		);
	}
}
    
async function pullInAllTheSitekeys() {
  let sitekeysNotCopiedRight = [];
  await getAllSitekeysFromFCP();
  for(container in containerList) {
    let containerSitekeysNotCopiedRight=[];
    for (sitekey in sitekeyList) {
      let filePath = `${path}${sitekeyList[sitekey]}/${containerList[container]}/config.json`;
      // console.log(filePath)
      let jconfig = await filesystem.readFileToObjectIfExists(filePath);
      // console.log(jconfig)
      if(jconfig === {} || !jconfig)
        await getConfigJson(path, [sitekeyList[sitekey]], containerList[container]);
      //else console.log(`The whole config.json for ${sitekeyList[sitekey]}'s ${containerList[container]} container looked good locally already.`)
      jconfig = await filesystem.readFileToObjectIfExists(filePath);
      if(jconfig === {} || !jconfig)
        containerSitekeysNotCopiedRight.push(sitekeyList[sitekey]);
    }
    sitekeysNotCopiedRight.push(containerSitekeysNotCopiedRight);
  }
  for(container in containerList) {
    console.log(`Sitekeys empty or not copied correctly from ${containerList[container]}:`);
    console.log(JSON.stringify(sitekeysNotCopiedRight[container]));
  }
  return;
}




























// Global Stuff Starts Here:
returnListThings.push("noGlobalCID");
returnListArrays.noGlobalCID = [];
returnListMessages.noGlobalCID = "the customerid not in globalconfigs";
returnListFunctions.noGlobalCID = async function (sitekey, container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
	if (!jconfig || !jconfig.global || !jconfig.global.customerId) {
		return true;
	}
	return false;
};

returnListThings.push("storageNotCookie");
returnListArrays.storageNotCookie = [];
returnListMessages.storageNotCookie = "the storage option is not COOKIE";
returnListFunctions.storageNotCookie = async function (sitekey, container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
	if ((((jconfig || {}).global || {}).storage || "COOKIE") != "COOKIE") {
    // console.log('storage',jconfig.global.storage)
		return true;
	}
	return false;
};






// Record Config Stuff Starts Here:
returnListThings.push("hasRecReplayPools");
returnListArrays.hasRecReplayPools = [];
returnListMessages.hasRecReplayPools = "record replay_pools";
returnListFunctions.hasRecReplayPools = async function (sitekey, container) {
  let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    ((((((jconfig || {}).record || {}).advancedSettings || {}).replay_pools || [])[0] || {}).path || ".") != "." ||
    ((((((jconfig || {}).record || {}).advancedSettings || {}).replay_pools || [])[0] || {}).sp || 100) != 100
  ) {
		return true;
	}
	return false;
}

returnListThings.push("hasRecDevBlacklist");
returnListArrays.hasRecDevBlacklist = [];
returnListMessages.hasRecDevBlacklist = "record device_blacklist";
returnListFunctions.hasRecDevBlacklist = async function (sitekey, container) {
  let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    ((((jconfig || {}).record || {}).advancedSettings || {}).device_blacklist) &&
    JSON.stringify(jconfig.record.advancedSettings.device_blacklist) != JSON.stringify(["blackberry"]) &&
    JSON.stringify(jconfig.record.advancedSettings.device_blacklist) != JSON.stringify(["HTC_Rezound", "blackberry"])
  ) {
    return true;
	}
	return false;
}






// Trigger Config Stuff Starts Here:
returnListThings.push("hasTriggerDelay");
returnListArrays.hasTriggerDelay = [];
returnListMessages.hasTriggerDelay = "trigger delay";
returnListFunctions.hasTriggerDelay = async function (sitekey, container) {
  let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((((jconfig || {}).trigger || {}).config || {}).triggerDelay || 0) != 0) {
		return true;
	}
	return false;
}

returnListThings.push("hasInviteDelay");
returnListArrays.hasInviteDelay = [];
returnListMessages.hasInviteDelay = "invite delay";
returnListFunctions.hasInviteDelay = async function (sitekey, container) {
  let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((((jconfig || {}).trigger || {}).config || {}).inviteDelay || 0) != 0) {
		return true;
	}
	return false;
}

returnListThings.push("hasPageLoadURLCB");
returnListArrays.hasPageLoadURLCB = [];
returnListMessages.hasPageLoadURLCB = "pageLoadUrlChangeBlackout";
returnListFunctions.hasPageLoadURLCB = async function (sitekey, container) {
  let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((((jconfig || {}).trigger || {}).config || {}).pageLoadUrlChangeBlackout || 0) != 0) {
		return true;
	}
	return false;
}

returnListThings.push("hasPagInvAvail");
returnListArrays.hasPagInvAvail = [];
returnListMessages.hasPagInvAvail = "pagesInviteAvailable being used";
returnListFunctions.hasPagInvAvail = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if ((((jconfig || {}).trigger || {}).config || {}).pagesInviteAvailable) {
    return true;
	}
	return false;
}

returnListThings.push("hasNot24PagViewsReset");
returnListArrays.hasNot24PagViewsReset = [];
returnListMessages.hasNot24PagViewsReset = "pageViewsResetTimeout not 24 hours";
returnListFunctions.hasNot24PagViewsReset = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((((jconfig || {}).trigger || {}).config || {}).pageViewsResetTimeout || 86400000) != 86400000) {
    return true;
	}
	return false;
}

returnListThings.push("hasNot24CppReset");
returnListArrays.hasNot24CppReset = [];
returnListMessages.hasNot24CppReset = "cppsResetTimeout not 24 hours";
returnListFunctions.hasNot24CppReset = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((((jconfig || {}).trigger || {}).config || {}).cppsResetTimeout || 86400000) != 86400000) {
    return true;
	}
	return false;
}

returnListThings.push("hasNot24DefReset");
returnListArrays.hasNot24DefReset = [];
returnListMessages.hasNot24DefReset = "surveyDefResetTimeout not 24 hours";
returnListFunctions.hasNot24DefReset = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((((jconfig || {}).trigger || {}).config || {}).surveyDefResetTimeout || 86400000) != 86400000) {
    return true;
	}
	return false;
}

returnListThings.push("hasNonDfltTrkCnvAfter");
returnListArrays.hasNonDfltTrkCnvAfter = [];
returnListMessages.hasNonDfltTrkCnvAfter = "trackerConvertsAfter not default";
returnListFunctions.hasNonDfltTrkCnvAfter = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
	if (
    ((((jconfig || {}).trigger || {}).config || {}).trackerConvertsAfter || 10000) != 10000 &&
    ((((jconfig || {}).trigger || {}).config || {}).trackerConvertsAfter || 30000) != 30000
  ) {
    return true;
	}
	return false;
}

returnListThings.push("hasNot10SecHBTO");
returnListArrays.hasNot10SecHBTO = [];
returnListMessages.hasNot10SecHBTO = "the trackerHeartbeatTimeout is not 10 seconds";
returnListFunctions.hasNot10SecHBTO = async function (sitekey, container) {
  let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((((jconfig || {}).trigger || {}).config || {}).trackerHeartbeatTimeout || 10000) != 10000) {
		return true;
	}
	return false;
}

returnListThings.push("hasNot60SecHB");
returnListArrays.hasNot60SecHB = [];
returnListMessages.hasNot60SecHB = "the onExitMobileHeartbeatInterval not a minute";
returnListFunctions.hasNot60SecHB = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
	if (((((jconfig || {}).trigger || {}).config || {}).onExitMobileHeartbeatInterval || 60000) != 60000) {
		return true;
	}
	return false;
}

returnListThings.push("hasCntrTrkrPopup");
returnListArrays.hasCntrTrkrPopup = [];
returnListMessages.hasCntrTrkrPopup = "has centerTrackerPopup";
returnListFunctions.hasCntrTrkrPopup = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
	if (((((jconfig || {}).trigger || {}).config || {}).centerTrackerPopup || false) != false) {
		return true;
	}
	return false;
}

returnListThings.push("hasWorkInIFr");
returnListArrays.hasWorkInIFr = [];
returnListMessages.hasWorkInIFr = "has workInIframes";
returnListFunctions.hasWorkInIFr = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
	if (
		jconfig &&
		jconfig.trigger &&
		jconfig.trigger.config &&
		jconfig.trigger.config.workInIframes &&
		jconfig.trigger.config.workInIframes != "dontRunOtherIframes"
	) {
		return true;
	}
	return false;
}

returnListThings.push("hasIgnNavEvents");
returnListArrays.hasIgnNavEvents = [];
returnListMessages.hasIgnNavEvents = "ignoreNavigationEvents being used";
returnListFunctions.hasIgnNavEvents = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.config &&
    jconfig.trigger.config.ignoreNavigationEvents &&
    jconfig.trigger.config.ignoreNavigationEvents == true
  ) {
    return true;
	}
	return false;
}

returnListThings.push("hasTriDevBlacklist");
returnListArrays.hasTriDevBlacklist = [];
returnListMessages.hasTriDevBlacklist = "trigger device_blacklist";
returnListFunctions.hasTriDevBlacklist = async function (sitekey, container) {
  let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    ((((jconfig || {}).trigger || {}).config || {}).device_blacklist) &&
    JSON.stringify(jconfig.trigger.config.device_blacklist) != JSON.stringify(["blackberry"]) &&
    JSON.stringify(jconfig.trigger.config.device_blacklist) != JSON.stringify(["HTC_Rezound", "blackberry"])
  ) {
		return true;
	}
	return false;
}

returnListThings.push("hasTriReplayPools");
returnListArrays.hasTriReplayPools = [];
returnListMessages.hasTriReplayPools = "trigger replay_pools";
returnListFunctions.hasTriReplayPools = async function (sitekey, container) {
  let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.config &&
    jconfig.trigger.config.replay_pools &&
    jconfig.trigger.config.replay_pools[0] &&
    (
      (jconfig.trigger.config.replay_pools[0].path &&
      jconfig.trigger.config.replay_pools[0].path != ".") ||
      (jconfig.trigger.config.replay_pools[0].sp &&
      jconfig.trigger.config.replay_pools[0].sp != 100)
    )
  ) {
		return true;
	}
	return false;
}

returnListThings.push("hasTriReplayRePools");
returnListArrays.hasTriReplayRePools = [];
returnListMessages.hasTriReplayRePools = "trigger replay_repools";
returnListFunctions.hasTriReplayRePools = async function (sitekey, container) {
  let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.config &&
    jconfig.trigger.config.replay_repools &&
    jconfig.trigger.config.replay_repools.length > 0
  ) {
		return true;
	}
	return false;
}

// SurveyDef Stuff Starts Here:
returnListThings.push("hasMOorCOutRP");
returnListArrays.hasMOorCOutRP = [];
returnListMessages.hasMOorCOutRP = "outreplaypool inside sp being used either in mouseoff or criteria";
returnListFunctions.hasMOorCOutRP = async function (sitekey,container) {
  let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].mouseoff &&
        jconfig.trigger.surveydefs[def].mouseoff.sp &&
        jconfig.trigger.surveydefs[def].mouseoff.sp.outreplaypool &&
        jconfig.trigger.surveydefs[def].mouseoff.sp.outreplaypool != 0
      ){
        // console.log('mouseoff outreplaypool',jconfig.trigger.surveydefs[def].mouseoff.sp.outreplaypool)
        return true;
      }
      if (
        jconfig.trigger.surveydefs[def].criteria &&
        jconfig.trigger.surveydefs[def].criteria.sp &&
        jconfig.trigger.surveydefs[def].criteria.sp.outreplaypool &&
        jconfig.trigger.surveydefs[def].criteria.sp.outreplaypool != 0
      ){
        // console.log('criteria outreplaypool',jconfig.trigger.surveydefs[def].criteria.sp.outreplaypool)
        return true;
      }
    }
  }
  return false;
}

returnListThings.push("hasMultMobDefs");
returnListArrays.hasMultMobDefs = [];
returnListMessages.hasMultMobDefs = "more than one mobile or more than one tablet def";
returnListFunctions.hasMultMobDefs = async function (sitekey, container) {
	let numberOfMobileDefs = 0;
	let numberOfTabletDefs = 0;
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
	if (jconfig) {
		if (jconfig.trigger) {
			if (jconfig.trigger.surveydefs) {
				if (jconfig.trigger.surveydefs.length > 1) {
					for (def in jconfig.trigger.surveydefs) {
						if (jconfig.trigger.surveydefs[def].criteria) {
              if (jconfig.trigger.surveydefs[def].criteria.supportsSmartPhones &&
                jconfig.trigger.surveydefs[def].criteria.supportsSmartPhones == true) {
								numberOfMobileDefs += 1;
							} else {
								// console.log(sitekey + " def " + def + " is not for mobile.")
							}
              if (jconfig.trigger.surveydefs[def].criteria.supportsTablets &&
                jconfig.trigger.surveydefs[def].criteria.supportsTablets == true) {
								numberOfTabletDefs += 1;
							} else {
								// console.log(sitekey + " def " + def + " is not for tablet.")
							}
						} else {
							// console.log(sitekey + " def " + def + " is missing criteria.");
						}
					}
				} else {
					// console.log(sitekey + " has less than two defs.");
				}
			} else {
				// console.log(sitekey + " is missing surveydefs.");
			}
		} else {
			// console.log(sitekey + " is missing trigger.");
		}
	} else {
		// console.log(sitekey + " is missing jconfig.");
	}
	if (numberOfMobileDefs > 1 || numberOfTabletDefs > 1) {
		return true;
	}
	return false;
}

returnListThings.push("hasRefOrUAInc");
returnListArrays.hasRefOrUAInc = [];
returnListMessages.hasRefOrUAInc = "a referrer or user agent include";
returnListFunctions.hasRefOrUAInc = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (jconfig.trigger.surveydefs[def].include &&
        (
          jconfig.trigger.surveydefs[def].include.referrers ||
          jconfig.trigger.surveydefs[def].include.userAgents
        )
      ){
        if (jconfig.trigger.surveydefs[def].include.referrers.length > 0) {
          return true;
        }
        if (jconfig.trigger.surveydefs[def].include.userAgents.length > 0) {
          return true;
        }
			}
		}
	}
	return false;
}

returnListThings.push("hasLinks");
returnListArrays.hasLinks = [];
returnListMessages.hasLinks = "a link of some kind being used";
returnListFunctions.hasLinks = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (jconfig.trigger.surveydefs[def].links &&
        (
          (jconfig.trigger.surveydefs[def].links.cancel && jconfig.trigger.surveydefs[def].links.cancel.length > 0) ||
          (jconfig.trigger.surveydefs[def].links.survey && jconfig.trigger.surveydefs[def].links.survey.length > 0) ||
          (jconfig.trigger.surveydefs[def].links.tracker && jconfig.trigger.surveydefs[def].links.tracker.length > 0)
        )
      ){
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskDispName");
returnListArrays.dispDeskDispName = [];
returnListMessages.dispDeskDispName = "a displayname for desktop that is not default or redesign";
returnListFunctions.dispDeskDispName = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].displayname &&
        jconfig.trigger.surveydefs[def].display.desktop[0].displayname != "default" &&
        jconfig.trigger.surveydefs[def].display.desktop[0].displayname != "redesign"
      ){
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskTemplate");
returnListArrays.dispDeskTemplate = [];
returnListMessages.dispDeskTemplate = "a template for desktop that is not classicdesktop or desktopredesign";
returnListFunctions.dispDeskTemplate = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].template &&
        jconfig.trigger.surveydefs[def].display.desktop[0].template != "classicdesktop" &&
        jconfig.trigger.surveydefs[def].display.desktop[0].template != "desktopredesign"
      ){
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskInvDelay");
returnListArrays.dispDeskInvDelay = [];
returnListMessages.dispDeskInvDelay = "an inviteDelay for desktop";
returnListFunctions.dispDeskInvDelay = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].inviteDelay
      ){
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskBDClose");
returnListArrays.dispDeskBDClose = [];
returnListMessages.dispDeskBDClose = "closeClickOnBackdrop for desktop being used";
returnListFunctions.dispDeskBDClose = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].closeClickOnBackdrop != true
      ){
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskNoSurvAlerts");
returnListArrays.dispDeskNoSurvAlerts = [];
returnListMessages.dispDeskNoSurvAlerts = "removeSurveyAlerts for desktop being used";
returnListFunctions.dispDeskNoSurvAlerts = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].removeSurveyAlerts != false
      ){
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskCustHead");
returnListArrays.dispDeskCustHead = [];
returnListMessages.dispDeskCustHead = "custom headline for desktop being used";
returnListFunctions.dispDeskCustHead = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog.headline &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog.headline != "We'd welcome your feedback!"
      ){
        // console.log('headline',jconfig.trigger.surveydefs[def].display.desktop[0].dialog.headline)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskCustBlurb");
returnListArrays.dispDeskCustBlurb = [];
returnListMessages.dispDeskCustBlurb = "custom blurb for desktop being used";
returnListFunctions.dispDeskCustBlurb = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog.blurb &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog.blurb != "Thank you for visiting our website. You have been selected to participate in a brief customer satisfaction survey to let us know how we can improve your experience." &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog.blurb != "Would you take a brief survey so we can improve your experience on our site?"
      ){
        // console.log('blurb',jconfig.trigger.surveydefs[def].display.desktop[0].dialog.blurb)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskInvButCloseText");
returnListArrays.dispDeskInvButCloseText = [];
returnListMessages.dispDeskInvButCloseText = "custom closeInviteButtonText for desktop being used";
returnListFunctions.dispDeskInvButCloseText = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog.closeInviteButtonText &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog.closeInviteButtonText != "Close dialog" &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog.closeInviteButtonText != "Click to close."
      ){
        // console.log('closeInviteButtonText',jconfig.trigger.surveydefs[def].display.desktop[0].dialog.closeInviteButtonText)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskInvDeclBut");
returnListArrays.dispDeskInvDeclBut = [];
returnListMessages.dispDeskInvDeclBut = "custom declineButton for desktop being used";
returnListFunctions.dispDeskInvDeclBut = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog.declineButton &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog.declineButton != "No thanks" &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog.declineButton != "No, thanks"
      ){
        // console.log('declineButton',jconfig.trigger.surveydefs[def].display.desktop[0].dialog.declineButton)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskInvAcptBut");
returnListArrays.dispDeskInvAcptBut = [];
returnListMessages.dispDeskInvAcptBut = "custom acceptButton for desktop being used";
returnListFunctions.dispDeskInvAcptBut = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog.acceptButton &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog.acceptButton != "Yes, I'll give feedback"
      ){
        // console.log('acceptButton',jconfig.trigger.surveydefs[def].display.desktop[0].dialog.acceptButton)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskInvAcptButTT");
returnListArrays.dispDeskInvAcptButTT = [];
returnListMessages.dispDeskInvAcptButTT = "custom acceptButtonTitleText for desktop being used";
returnListFunctions.dispDeskInvAcptButTT = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog.acceptButtonTitleText &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog.acceptButtonTitleText != "Yes, I'll give feedback (Opens in a new window)"
      ){
        // console.log('acceptButtonTitleText',jconfig.trigger.surveydefs[def].display.desktop[0].dialog.acceptButtonTitleText)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskInvErr");
returnListArrays.dispDeskInvErr = [];
returnListMessages.dispDeskInvErr = "custom error for desktop being used";
returnListFunctions.dispDeskInvErr = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog.error &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog.error != "Error"
      ){
        // console.log('error',jconfig.trigger.surveydefs[def].display.desktop[0].dialog.error)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskInvWarn");
returnListArrays.dispDeskInvWarn = [];
returnListMessages.dispDeskInvWarn = "custom warnLaunch for desktop being used";
returnListFunctions.dispDeskInvWarn = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog.warnLaunch &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog.warnLaunch != "this will launch a new window"
      ){
        // console.log('warnLaunch',jconfig.trigger.surveydefs[def].display.desktop[0].dialog.warnLaunch)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskInvCanClose");
returnListArrays.dispDeskInvCanClose = [];
returnListMessages.dispDeskInvCanClose = "custom allowclose for desktop being used";
returnListFunctions.dispDeskInvCanClose = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog.allowclose != true
      ){
        // console.log('allowclose',jconfig.trigger.surveydefs[def].display.desktop[0].dialog.allowclose)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskInvSurvAvail");
returnListArrays.dispDeskInvSurvAvail = [];
returnListMessages.dispDeskInvSurvAvail = "custom surveyavailable for desktop being used";
returnListFunctions.dispDeskInvSurvAvail = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog.surveyavailable &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog.surveyavailable != "Your survey is now available"
      ){
        // console.log('surveyavailable',jconfig.trigger.surveydefs[def].display.desktop[0].dialog.surveyavailable)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskInvPwdLink");
returnListArrays.dispDeskInvPwdLink = [];
returnListMessages.dispDeskInvPwdLink = "custom poweredbyLink for desktop being used";
returnListFunctions.dispDeskInvPwdLink = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog.poweredbyLink &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog.poweredbyLink != "http://www.foresee.com"
      ){
        // console.log('poweredbyLink',jconfig.trigger.surveydefs[def].display.desktop[0].dialog.poweredbyLink)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskInvPwdTxt");
returnListArrays.dispDeskInvPwdTxt = [];
returnListMessages.dispDeskInvPwdTxt = "custom poweredbyText for desktop being used";
returnListFunctions.dispDeskInvPwdTxt = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog.poweredbyText &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog.poweredbyText != "Powered by ForeSee"
      ){
        // console.log('poweredbyText',jconfig.trigger.surveydefs[def].display.desktop[0].dialog.poweredbyText)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskInvPrvyTxt");
returnListArrays.dispDeskInvPrvyTxt = [];
returnListMessages.dispDeskInvPrvyTxt = "custom privacyPolicyText for desktop being used";
returnListFunctions.dispDeskInvPrvyTxt = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog.privacyPolicyText &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog.privacyPolicyText != "Privacy Policy"
      ){
        // console.log('privacyPolicyText',jconfig.trigger.surveydefs[def].display.desktop[0].dialog.privacyPolicyText)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskInvPrvyLink");
returnListArrays.dispDeskInvPrvyLink = [];
returnListMessages.dispDeskInvPrvyLink = "custom privacyPolicyLink for desktop being used";
returnListFunctions.dispDeskInvPrvyLink = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog.privacyPolicyLink &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog.privacyPolicyLink != "//www.foresee.com/privacy-policy/"
      ){
        // console.log('privacyPolicyLink',jconfig.trigger.surveydefs[def].display.desktop[0].dialog.privacyPolicyLink)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskTkrTitle");
returnListArrays.dispDeskTkrTitle = [];
returnListMessages.dispDeskTkrTitle = "custom trackerTitle for desktop being used";
returnListFunctions.dispDeskTkrTitle = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog.trackerTitle &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog.trackerTitle != "ForeSee - Survey Tracker Window" &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog.trackerTitle != "ForeSee - Survey Window"
      ){
        // console.log('trackerTitle',jconfig.trigger.surveydefs[def].display.desktop[0].dialog.trackerTitle)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskTkrProceed");
returnListArrays.dispDeskTkrProceed = [];
returnListMessages.dispDeskTkrProceed = "custom trackerClickToView for desktop being used";
returnListFunctions.dispDeskTkrProceed = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog.trackerClickToView &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog.trackerClickToView != "Click to view the survey." &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog.trackerClickToView != "Begin Survey Now"
      ){
        // console.log('trackerClickToView',jconfig.trigger.surveydefs[def].display.desktop[0].dialog.trackerClickToView)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskTkrStayOpen");
returnListArrays.dispDeskTkrStayOpen = [];
returnListMessages.dispDeskTkrStayOpen = "custom trackerPlsLeaveOpen for desktop being used";
returnListFunctions.dispDeskTkrStayOpen = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog.trackerPlsLeaveOpen &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog.trackerPlsLeaveOpen != "Please leave this window open." &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog.trackerPlsLeaveOpen != "Please keep this window open!"
      ){
        // console.log('trackerPlsLeaveOpen',jconfig.trigger.surveydefs[def].display.desktop[0].dialog.trackerPlsLeaveOpen)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskTkrDesc1");
returnListArrays.dispDeskTkrDesc1 = [];
returnListMessages.dispDeskTkrDesc1 = "custom trackerDesc1 for desktop being used";
returnListFunctions.dispDeskTkrDesc1 = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog.trackerDesc1 &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog.trackerDesc1 != "It is part of the customer satisfaction survey you agreed to take on this site. You may click here when ready to complete the survey, although it should activate on its own after a few moments when you have left the site." &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog.trackerDesc1 != "<strong>We'll ask you some questions after you finish your visit.</strong><br><br>The survey will appear in this window. You can minimize it for now or simply click on the window of our website."
      ){
        // console.log('trackerDesc1',jconfig.trigger.surveydefs[def].display.desktop[0].dialog.trackerDesc1)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskTkrDesc2");
returnListArrays.dispDeskTkrDesc2 = [];
returnListMessages.dispDeskTkrDesc2 = "custom trackerDesc2 for desktop being used";
returnListFunctions.dispDeskTkrDesc2 = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog.trackerDesc2 &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog.trackerDesc2 != "Please leave this window open until you have completed your time on this site. This window is part of the customer satisfaction survey you agreed to take on this site. You may click here when ready to complete the survey, although it should activate on its own after a few moments when you have left the site." &&
        jconfig.trigger.surveydefs[def].display.desktop[0].dialog.trackerDesc2 != "<strong>If your session is complete, please click below to begin the survey.</strong><br><br>The survey will appear in this window. You can minimize it for now or simply click on the window of our website."
      ){
        // console.log('trackerDesc2',jconfig.trigger.surveydefs[def].display.desktop[0].dialog.trackerDesc2)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyFont");
returnListArrays.dispDeskStyFont = [];
returnListMessages.dispDeskStyFont = "custom fonts for desktop style being used";
returnListFunctions.dispDeskStyFont = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.fonts &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.fonts.length > 0
      ){
        // console.log('fonts',jconfig.trigger.surveydefs[def].display.desktop[0].style.fonts)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyBGColor");
returnListArrays.dispDeskStyBGColor = [];
returnListMessages.dispDeskStyBGColor = "custom backgroundColor for desktop style being used";
returnListFunctions.dispDeskStyBGColor = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.backgroundColor &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.backgroundColor != "#FFFFFF"
      ){
        // console.log('backgroundColor',jconfig.trigger.surveydefs[def].display.desktop[0].style.backgroundColor)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyBrandColor");
returnListArrays.dispDeskStyBrandColor = [];
returnListMessages.dispDeskStyBrandColor = "custom brandColor for desktop style being used";
returnListFunctions.dispDeskStyBrandColor = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.brandColor &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.brandColor != "#425563"
      ){
        // console.log('brandColor',jconfig.trigger.surveydefs[def].display.desktop[0].style.brandColor)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyInvBGImage");
returnListArrays.dispDeskStyInvBGImage = [];
returnListMessages.dispDeskStyInvBGImage = "custom backgroundImage for desktop style invite being used";
returnListFunctions.dispDeskStyInvBGImage = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.backgroundImage &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.backgroundImage != ""
      ){
        // console.log('backgroundImage',jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.backgroundImage)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyInvHeight");
returnListArrays.dispDeskStyInvHeight = [];
returnListMessages.dispDeskStyInvHeight = "custom height for desktop style invite being used";
returnListFunctions.dispDeskStyInvHeight = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.height &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.height != ""
      ){
        // console.log('height',jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.height)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyInvWidth");
returnListArrays.dispDeskStyInvWidth = [];
returnListMessages.dispDeskStyInvWidth = "custom width for desktop style invite being used";
returnListFunctions.dispDeskStyInvWidth = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.width &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.width != ""
      ){
        // console.log('width',jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.width)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyInvBorderRad");
returnListArrays.dispDeskStyInvBorderRad = [];
returnListMessages.dispDeskStyInvBorderRad = "custom borderRadius for desktop style invite being used";
returnListFunctions.dispDeskStyInvBorderRad = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.borderRadius &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.borderRadius != ""
      ){
        // console.log('borderRadius',jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.borderRadius)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyInvBanBGColor");
returnListArrays.dispDeskStyInvBanBGColor = [];
returnListMessages.dispDeskStyInvBanBGColor = "custom bannerBackgroundColor for desktop style invite being used";
returnListFunctions.dispDeskStyInvBanBGColor = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.bannerBackgroundColor &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.bannerBackgroundColor != "#425563"
      ){
        // console.log('bannerBackgroundColor',jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.bannerBackgroundColor)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyInvBanHeight");
returnListArrays.dispDeskStyInvBanHeight = [];
returnListMessages.dispDeskStyInvBanHeight = "custom bannerHeight for desktop style invite being used";
returnListFunctions.dispDeskStyInvBanHeight = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.bannerHeight &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.bannerHeight != ""
      ){
        // console.log('bannerHeight',jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.bannerHeight)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyInvLogoMarg");
returnListArrays.dispDeskStyInvLogoMarg = [];
returnListMessages.dispDeskStyInvLogoMarg = "custom logoMargin for desktop style invite being used";
returnListFunctions.dispDeskStyInvLogoMarg = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.logoMargin &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.logoMargin != ""
      ){
        // console.log('logoMargin',jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.logoMargin)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyInvLogoBGColor");
returnListArrays.dispDeskStyInvLogoBGColor = [];
returnListMessages.dispDeskStyInvLogoBGColor = "custom logoBackgroundColor for desktop style invite being used";
returnListFunctions.dispDeskStyInvLogoBGColor = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.logoBackgroundColor &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.logoBackgroundColor != ""
      ){
        // console.log('logoBackgroundColor',jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.logoBackgroundColor)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyInvNoLogo");
returnListArrays.dispDeskStyInvNoLogo = [];
returnListMessages.dispDeskStyInvNoLogo = "custom logoHide for desktop style invite being used";
returnListFunctions.dispDeskStyInvNoLogo = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.logoHide != false
      ){
        // console.log('logoHide',jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.logoHide)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyInvHeadFont");
returnListArrays.dispDeskStyInvHeadFont = [];
returnListMessages.dispDeskStyInvHeadFont = "custom headerFontFamily for desktop style invite being used";
returnListFunctions.dispDeskStyInvHeadFont = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.headerFontFamily &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.headerFontFamily != ""
      ){
        // console.log('headerFontFamily',jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.headerFontFamily)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyInvHeadFontSize");
returnListArrays.dispDeskStyInvHeadFontSize = [];
returnListMessages.dispDeskStyInvHeadFontSize = "custom headerFontSize for desktop style invite being used";
returnListFunctions.dispDeskStyInvHeadFontSize = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.headerFontSize &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.headerFontSize != ""
      ){
        // console.log('headerFontSize',jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.headerFontSize)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyInvHeadLineHt");
returnListArrays.dispDeskStyInvHeadLineHt = [];
returnListMessages.dispDeskStyInvHeadLineHt = "custom headerLineHeight for desktop style invite being used";
returnListFunctions.dispDeskStyInvHeadLineHt = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.headerLineHeight &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.headerLineHeight != ""
      ){
        // console.log('headerLineHeight',jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.headerLineHeight)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyInvHeadFontWeight");
returnListArrays.dispDeskStyInvHeadFontWeight = [];
returnListMessages.dispDeskStyInvHeadFontWeight = "custom headerFontWeight for desktop style invite being used";
returnListFunctions.dispDeskStyInvHeadFontWeight = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.headerFontWeight &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.headerFontWeight != ""
      ){
        // console.log('headerFontWeight',jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.headerFontWeight)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyInvHeadTxtDecor");
returnListArrays.dispDeskStyInvHeadTxtDecor = [];
returnListMessages.dispDeskStyInvHeadTxtDecor = "custom headerTextDecor for desktop style invite being used";
returnListFunctions.dispDeskStyInvHeadTxtDecor = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.headerTextDecor &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.headerTextDecor != ""
      ){
        // console.log('headerTextDecor',jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.headerTextDecor)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyInvBodyFont");
returnListArrays.dispDeskStyInvBodyFont = [];
returnListMessages.dispDeskStyInvBodyFont = "custom bodyFontFamily for desktop style invite being used";
returnListFunctions.dispDeskStyInvBodyFont = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.bodyFontFamily &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.bodyFontFamily != ""
      ){
        // console.log('bodyFontFamily',jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.bodyFontFamily)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyInvBodyFontSize");
returnListArrays.dispDeskStyInvBodyFontSize = [];
returnListMessages.dispDeskStyInvBodyFontSize = "custom bodyFontSize for desktop style invite being used";
returnListFunctions.dispDeskStyInvBodyFontSize = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.bodyFontSize &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.bodyFontSize != ""
      ){
        // console.log('bodyFontSize',jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.bodyFontSize)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyInvBodyFontHt");
returnListArrays.dispDeskStyInvBodyFontHt = [];
returnListMessages.dispDeskStyInvBodyFontHt = "custom bodyLineHeight for desktop style invite being used";
returnListFunctions.dispDeskStyInvBodyFontHt = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.bodyLineHeight &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.bodyLineHeight != ""
      ){
        // console.log('bodyLineHeight',jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.bodyLineHeight)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyInvBodyTxtDecor");
returnListArrays.dispDeskStyInvBodyTxtDecor = [];
returnListMessages.dispDeskStyInvBodyTxtDecor = "custom bodyTextDecor for desktop style invite being used";
returnListFunctions.dispDeskStyInvBodyTxtDecor = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.bodyTextDecor &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.bodyTextDecor != ""
      ){
        // console.log('bodyTextDecor',jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.bodyTextDecor)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyInvButFont");
returnListArrays.dispDeskStyInvButFont = [];
returnListMessages.dispDeskStyInvButFont = "custom buttonFontFamily for desktop style invite being used";
returnListFunctions.dispDeskStyInvButFont = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.buttonFontFamily &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.buttonFontFamily != ""
      ){
        // console.log('buttonFontFamily',jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.buttonFontFamily)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyInvButBorder");
returnListArrays.dispDeskStyInvButBorder = [];
returnListMessages.dispDeskStyInvButBorder = "custom buttonBorder for desktop style invite being used";
returnListFunctions.dispDeskStyInvButBorder = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.buttonBorder &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.buttonBorder != ""
      ){
        // console.log('buttonBorder',jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.buttonBorder)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyInvButBorderRad");
returnListArrays.dispDeskStyInvButBorderRad = [];
returnListMessages.dispDeskStyInvButBorderRad = "custom buttonBorderRadius for desktop style invite being used";
returnListFunctions.dispDeskStyInvButBorderRad = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.buttonBorderRadius &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.buttonBorderRadius != ""
      ){
        // console.log('buttonBorderRadius',jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.buttonBorderRadius)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyInvYesTxtColor");
returnListArrays.dispDeskStyInvYesTxtColor = [];
returnListMessages.dispDeskStyInvYesTxtColor = "custom acceptTextColor for desktop style invite being used";
returnListFunctions.dispDeskStyInvYesTxtColor = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.acceptTextColor &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.acceptTextColor != ""
      ){
        // console.log('acceptTextColor',jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.acceptTextColor)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyInvYesFontSize");
returnListArrays.dispDeskStyInvYesFontSize = [];
returnListMessages.dispDeskStyInvYesFontSize = "custom acceptFontSize for desktop style invite being used";
returnListFunctions.dispDeskStyInvYesFontSize = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.acceptFontSize &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.acceptFontSize != ""
      ){
        // console.log('acceptFontSize',jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.acceptFontSize)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyInvNoTxtColor");
returnListArrays.dispDeskStyInvNoTxtColor = [];
returnListMessages.dispDeskStyInvNoTxtColor = "custom declineTextColor for desktop style invite being used";
returnListFunctions.dispDeskStyInvNoTxtColor = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.declineTextColor &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.declineTextColor != ""
      ){
        // console.log('declineTextColor',jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.declineTextColor)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyInvNoFontSize");
returnListArrays.dispDeskStyInvNoFontSize = [];
returnListMessages.dispDeskStyInvNoFontSize = "custom declineFontSize for desktop style invite being used";
returnListFunctions.dispDeskStyInvNoFontSize = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.declineFontSize &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.declineFontSize != ""
      ){
        // console.log('declineFontSize',jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.declineFontSize)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyInvXColor");
returnListArrays.dispDeskStyInvXColor = [];
returnListMessages.dispDeskStyInvXColor = "custom xColor for desktop style invite being used";
returnListFunctions.dispDeskStyInvXColor = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.xColor &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.xColor != ""
      ){
        // console.log('xColor',jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.xColor)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyInvXBorderRad");
returnListArrays.dispDeskStyInvXBorderRad = [];
returnListMessages.dispDeskStyInvXBorderRad = "custom xBorderRadius for desktop style invite being used";
returnListFunctions.dispDeskStyInvXBorderRad = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.xBorderRadius &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.xBorderRadius != ""
      ){
        // console.log('xBorderRadius',jconfig.trigger.surveydefs[def].display.desktop[0].style.invite.xBorderRadius)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyTkrMarg");
returnListArrays.dispDeskStyTkrMarg = [];
returnListMessages.dispDeskStyTkrMarg = "custom margin for desktop style tracker being used";
returnListFunctions.dispDeskStyTkrMarg = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.margin &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.margin != ""
      ){
        // console.log('margin',jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.margin)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyTkrLBGColor");
returnListArrays.dispDeskStyTkrLBGColor = [];
returnListMessages.dispDeskStyTkrLBGColor = "custom leftBackgroundColor for desktop style tracker being used";
returnListFunctions.dispDeskStyTkrLBGColor = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.leftBackgroundColor &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.leftBackgroundColor != ""
      ){
        // console.log('leftBackgroundColor',jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.leftBackgroundColor)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyTkrNoLogo");
returnListArrays.dispDeskStyTkrNoLogo = [];
returnListMessages.dispDeskStyTkrNoLogo = "custom logoHide for desktop style tracker being used";
returnListFunctions.dispDeskStyTkrNoLogo = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.logoHide != false
      ){
        // console.log('logoHide',jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.logoHide)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyTkrHeadFont");
returnListArrays.dispDeskStyTkrHeadFont = [];
returnListMessages.dispDeskStyTkrHeadFont = "custom headerFontFamily for desktop style tracker being used";
returnListFunctions.dispDeskStyTkrHeadFont = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.headerFontFamily &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.headerFontFamily != ""
      ){
        // console.log('headerFontFamily',jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.headerFontFamily)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyTkrHeadFontSize");
returnListArrays.dispDeskStyTkrHeadFontSize = [];
returnListMessages.dispDeskStyTkrHeadFontSize = "custom headerFontSize for desktop style tracker being used";
returnListFunctions.dispDeskStyTkrHeadFontSize = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.headerFontSize &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.headerFontSize != ""
      ){
        // console.log('headerFontSize',jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.headerFontSize)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyTkrHeadHt");
returnListArrays.dispDeskStyTkrHeadHt = [];
returnListMessages.dispDeskStyTkrHeadHt = "custom headerLineHeight for desktop style tracker being used";
returnListFunctions.dispDeskStyTkrHeadHt = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.headerLineHeight &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.headerLineHeight != ""
      ){
        // console.log('headerLineHeight',jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.headerLineHeight)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyTkrHeadFontWt");
returnListArrays.dispDeskStyTkrHeadFontWt = [];
returnListMessages.dispDeskStyTkrHeadFontWt = "custom headerFontWeight for desktop style tracker being used";
returnListFunctions.dispDeskStyTkrHeadFontWt = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.headerFontWeight &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.headerFontWeight != ""
      ){
        // console.log('headerFontWeight',jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.headerFontWeight)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyTkrHeadTxtDecor");
returnListArrays.dispDeskStyTkrHeadTxtDecor = [];
returnListMessages.dispDeskStyTkrHeadTxtDecor = "custom headerTextDecor for desktop style tracker being used";
returnListFunctions.dispDeskStyTkrHeadTxtDecor = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.headerTextDecor &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.headerTextDecor != ""
      ){
        // console.log('headerTextDecor',jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.headerTextDecor)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyTkrBodyFont");
returnListArrays.dispDeskStyTkrBodyFont = [];
returnListMessages.dispDeskStyTkrBodyFont = "custom bodyFontFamily for desktop style tracker being used";
returnListFunctions.dispDeskStyTkrBodyFont = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.bodyFontFamily &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.bodyFontFamily != ""
      ){
        // console.log('bodyFontFamily',jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.bodyFontFamily)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyTkrBodyFontSize");
returnListArrays.dispDeskStyTkrBodyFontSize = [];
returnListMessages.dispDeskStyTkrBodyFontSize = "custom bodyFontSize for desktop style tracker being used";
returnListFunctions.dispDeskStyTkrBodyFontSize = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.bodyFontSize &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.bodyFontSize != ""
      ){
        // console.log('bodyFontSize',jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.bodyFontSize)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyTkrBodyHt");
returnListArrays.dispDeskStyTkrBodyHt = [];
returnListMessages.dispDeskStyTkrBodyHt = "custom bodyLineHeight for desktop style tracker being used";
returnListFunctions.dispDeskStyTkrBodyHt = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.bodyLineHeight &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.bodyLineHeight != ""
      ){
        // console.log('bodyLineHeight',jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.bodyLineHeight)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyTkrButFont");
returnListArrays.dispDeskStyTkrButFont = [];
returnListMessages.dispDeskStyTkrButFont = "custom buttonFontFamily for desktop style tracker being used";
returnListFunctions.dispDeskStyTkrButFont = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.buttonFontFamily &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.buttonFontFamily != ""
      ){
        // console.log('buttonFontFamily',jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.buttonFontFamily)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyTkrButBorder");
returnListArrays.dispDeskStyTkrButBorder = [];
returnListMessages.dispDeskStyTkrButBorder = "custom startBorder for desktop style tracker being used";
returnListFunctions.dispDeskStyTkrButBorder = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.startBorder &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.startBorder != ""
      ){
        // console.log('startBorder',jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.startBorder)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyTkrButBorderRad");
returnListArrays.dispDeskStyTkrButBorderRad = [];
returnListMessages.dispDeskStyTkrButBorderRad = "custom startBorderRadius for desktop style tracker being used";
returnListFunctions.dispDeskStyTkrButBorderRad = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.startBorderRadius &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.startBorderRadius != ""
      ){
        // console.log('startBorderRadius',jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.startBorderRadius)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyTkrButTxtColor");
returnListArrays.dispDeskStyTkrButTxtColor = [];
returnListMessages.dispDeskStyTkrButTxtColor = "custom startTextColor for desktop style tracker being used";
returnListFunctions.dispDeskStyTkrButTxtColor = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.startTextColor &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.startTextColor != ""
      ){
        // console.log('startTextColor',jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.startTextColor)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyTkrButFontSize");
returnListArrays.dispDeskStyTkrButFontSize = [];
returnListMessages.dispDeskStyTkrButFontSize = "custom startFontSize for desktop style tracker being used";
returnListFunctions.dispDeskStyTkrButFontSize = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.startFontSize &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.startFontSize != ""
      ){
        // console.log('startFontSize',jconfig.trigger.surveydefs[def].display.desktop[0].style.tracker.startFontSize)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyPreSet");
returnListArrays.dispDeskStyPreSet = [];
returnListMessages.dispDeskStyPreSet = "custom presetStyles for desktop style being used";
returnListFunctions.dispDeskStyPreSet = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.presetStyles &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.presetStyles != ""
      ){
        // console.log('presetStyles',jconfig.trigger.surveydefs[def].display.desktop[0].style.presetStyles)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispDeskStyCustBlock");
returnListArrays.dispDeskStyCustBlock = [];
returnListMessages.dispDeskStyCustBlock = "custom customStyleBlock for desktop style being used";
returnListFunctions.dispDeskStyCustBlock = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (
    jconfig &&
    jconfig.trigger &&
    jconfig.trigger.surveydefs
  ) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        jconfig.trigger.surveydefs[def].display &&
        jconfig.trigger.surveydefs[def].display.desktop &&
        jconfig.trigger.surveydefs[def].display.desktop.length > 0 &&
        jconfig.trigger.surveydefs[def].display.desktop[0] &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.customStyleBlock &&
        jconfig.trigger.surveydefs[def].display.desktop[0].style.customStyleBlock != ""
      ){
        // console.log('customStyleBlock',jconfig.trigger.surveydefs[def].display.mobile[0].style.customStyleBlock)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobDispName");
returnListArrays.dispMobDispName = [];
returnListMessages.dispMobDispName = "custom displayname for mobile being used";
returnListFunctions.dispMobDispName = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if (((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).displayname || "default") != "default"){
        // console.log('displayname',jconfig.trigger.surveydefs[def].display.mobile[0].displayname)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobTemplate");
returnListArrays.dispMobTemplate = [];
returnListMessages.dispMobTemplate = "custom template for mobile being used";
returnListFunctions.dispMobTemplate = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if (((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).template || "mobile") != "mobile"){
        // console.log('template',jconfig.trigger.surveydefs[def].display.mobile[0].template)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobLogoTT");
returnListArrays.dispMobLogoTT = [];
returnListMessages.dispMobLogoTT = "custom siteLogoTitleText for mobile being used";
returnListFunctions.dispMobLogoTT = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if (((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).siteLogoTitleText || "") != ""){
        // console.log('siteLogoTitleText',jconfig.trigger.surveydefs[def].display.mobile[0].siteLogoTitleText)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobLogoAT");
returnListArrays.dispMobLogoAT = [];
returnListMessages.dispMobLogoAT = "custom siteLogoAltText for mobile being used";
returnListFunctions.dispMobLogoAT = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if (((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).siteLogoAltText || "") != ""){
        // console.log('siteLogoAltText',jconfig.trigger.surveydefs[def].display.mobile[0].siteLogoAltText)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobVLogo");
returnListArrays.dispMobVLogo = [];
returnListMessages.dispMobVLogo = "custom vendorLogo for mobile being used";
returnListFunctions.dispMobVLogo = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if (((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).vendorLogo || "fslogo.svg") != "fslogo.svg"){
        // console.log('vendorLogo',jconfig.trigger.surveydefs[def].display.mobile[0].vendorLogo)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobVLogoPNG");
returnListArrays.dispMobVLogoPNG = [];
returnListMessages.dispMobVLogoPNG = "custom vendorLogoPNG for mobile being used";
returnListFunctions.dispMobVLogoPNG = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if (((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).vendorLogoPNG || "fslogo.png") != "fslogo.png"){
        // console.log('vendorLogoPNG',jconfig.trigger.surveydefs[def].display.mobile[0].vendorLogoPNG)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobVTT");
returnListArrays.dispMobVTT = [];
returnListMessages.dispMobVTT = "custom vendorTitleText for mobile being used";
returnListFunctions.dispMobVTT = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if (((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).vendorTitleText || "ForeSee") != "ForeSee"){
        // console.log('vendorTitleText',jconfig.trigger.surveydefs[def].display.mobile[0].vendorTitleText)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobVAT");
returnListArrays.dispMobVAT = [];
returnListMessages.dispMobVAT = "custom vendorAltText for mobile being used";
returnListFunctions.dispMobVAT = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if (((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).vendorAltText || "ForeSee Logo") != "ForeSee Logo"){
        // console.log('vendorAltText',jconfig.trigger.surveydefs[def].display.mobile[0].vendorAltText)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobNoFSLogo");
returnListArrays.dispMobNoFSLogo = [];
returnListMessages.dispMobNoFSLogo = "custom hideForeSeeLogoMobile for mobile being used";
returnListFunctions.dispMobNoFSLogo = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if (((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).hideForeSeeLogoMobile || false) != false){
        // console.log('hideForeSeeLogoMobile',jconfig.trigger.surveydefs[def].display.mobile[0].hideForeSeeLogoMobile)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobInvDelay");
returnListArrays.dispMobInvDelay = [];
returnListMessages.dispMobInvDelay = "custom inviteDelay for mobile being used";
returnListFunctions.dispMobInvDelay = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if ((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).inviteDelay){
        // console.log('inviteDelay',jconfig.trigger.surveydefs[def].display.mobile[0].inviteDelay)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobTrapFocus");
returnListArrays.dispMobTrapFocus = [];
returnListMessages.dispMobTrapFocus = "custom trapFocus for mobile being used";
returnListFunctions.dispMobTrapFocus = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if (((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).trapFocus || false) != false){
        // console.log('trapFocus',jconfig.trigger.surveydefs[def].display.mobile[0].trapFocus)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobAriaX");
returnListArrays.dispMobAriaX = [];
returnListMessages.dispMobAriaX = "custom ariaCloseInvite for mobile being used";
returnListFunctions.dispMobAriaX = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if ((((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).dialog || {}).ariaCloseInvite || "Close dialog") != "Close dialog"){
        // console.log('ariaCloseInvite',jconfig.trigger.surveydefs[def].display.mobile[0].dialog.ariaCloseInvite)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobHeadline");
returnListArrays.dispMobHeadline = [];
returnListMessages.dispMobHeadline = "custom headline for mobile being used";
returnListFunctions.dispMobHeadline = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if ((((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).dialog || {}).headline || "We'd welcome your feedback!") != "We'd welcome your feedback!"){
        // console.log('headline',jconfig.trigger.surveydefs[def].display.mobile[0].dialog.headline)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobSubheadline");
returnListArrays.dispMobSubheadline = [];
returnListMessages.dispMobSubheadline = "custom subheadline for mobile being used";
returnListFunctions.dispMobSubheadline = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if ((((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).dialog || {}).subheadline || "Can we send you a brief survey so we can improve your experience on this website?") != "Can we send you a brief survey so we can improve your experience on this website?"){
        // console.log('subheadline',jconfig.trigger.surveydefs[def].display.mobile[0].dialog.subheadline)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobDeclBut");
returnListArrays.dispMobDeclBut = [];
returnListMessages.dispMobDeclBut = "custom declineButton for mobile being used";
returnListFunctions.dispMobDeclBut = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if ((((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).dialog || {}).declineButton || "No, thanks") != "No, thanks"){
        // console.log('declineButton',jconfig.trigger.surveydefs[def].display.mobile[0].dialog.declineButton)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobAcptBut");
returnListArrays.dispMobAcptBut = [];
returnListMessages.dispMobAcptBut = "custom acceptButton for mobile being used";
returnListFunctions.dispMobAcptBut = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if ((((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).dialog || {}).acceptButton || "Yes, I'll help") != "Yes, I'll help"){
        // console.log('acceptButton',jconfig.trigger.surveydefs[def].display.mobile[0].dialog.acceptButton)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobEmailBut");
returnListArrays.dispMobEmailBut = [];
returnListMessages.dispMobEmailBut = "custom emailButton for mobile being used";
returnListFunctions.dispMobEmailBut = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if ((((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).dialog || {}).emailButton || "Email me") != "Email me"){
        // console.log('emailButton',jconfig.trigger.surveydefs[def].display.mobile[0].dialog.emailButton)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobTxtBut");
returnListArrays.dispMobTxtBut = [];
returnListMessages.dispMobTxtBut = "custom textButton for mobile being used";
returnListFunctions.dispMobTxtBut = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if ((((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).dialog || {}).textButton || "Text me") != "Text me"){
        // console.log('textButton',jconfig.trigger.surveydefs[def].display.mobile[0].dialog.textButton)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobPwdBy");
returnListArrays.dispMobPwdBy = [];
returnListMessages.dispMobPwdBy = "custom poweredbyDisclaimer for mobile being used";
returnListFunctions.dispMobPwdBy = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if (((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).dialog || {}).poweredbyDisclaimer){
        // console.log('poweredbyDisclaimer',jconfig.trigger.surveydefs[def].display.mobile[0].dialog.poweredbyDisclaimer)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobPwdByLink");
returnListArrays.dispMobPwdByLink = [];
returnListMessages.dispMobPwdByLink = "custom poweredbyLink for mobile being used";
returnListFunctions.dispMobPwdByLink = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if ((((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).dialog || {}).poweredbyLink || "http://www.foresee.com") != "http://www.foresee.com"){
        // console.log('poweredbyLink',jconfig.trigger.surveydefs[def].display.mobile[0].dialog.poweredbyLink)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobPwdByTxt");
returnListArrays.dispMobPwdByTxt = [];
returnListMessages.dispMobPwdByTxt = "custom poweredbyText for mobile being used";
returnListFunctions.dispMobPwdByTxt = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if ((((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).dialog || {}).poweredbyText || "Powered by ForeSee") != "Powered by ForeSee"){
        // console.log('poweredbyText',jconfig.trigger.surveydefs[def].display.mobile[0].dialog.poweredbyText)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobAriaContactLbl");
returnListArrays.dispMobAriaContactLbl = [];
returnListMessages.dispMobAriaContactLbl = "custom ariaContactLabel for mobile being used";
returnListFunctions.dispMobAriaContactLbl = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if ((((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).dialog || {}).ariaContactLabel || "Please provide your contact information") != "Please provide your contact information"){
        // console.log('ariaContactLabel',jconfig.trigger.surveydefs[def].display.mobile[0].dialog.ariaContactLabel)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobEmailPH");
returnListArrays.dispMobEmailPH = [];
returnListMessages.dispMobEmailPH = "custom emailPlaceholder for mobile being used";
returnListFunctions.dispMobEmailPH = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if ((((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).dialog || {}).emailPlaceholder || "Your email...") != "Your email..."){
        // console.log('emailPlaceholder',jconfig.trigger.surveydefs[def].display.mobile[0].dialog.emailPlaceholder)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobTxtPH");
returnListArrays.dispMobTxtPH = [];
returnListMessages.dispMobTxtPH = "custom textPlaceholder for mobile being used";
returnListFunctions.dispMobTxtPH = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if ((((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).dialog || {}).textPlaceholder || "Your cellphone number...") != "Your cellphone number..."){
        // console.log('textPlaceholder',jconfig.trigger.surveydefs[def].display.mobile[0].dialog.textPlaceholder)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobSubmitBut");
returnListArrays.dispMobSubmitBut = [];
returnListMessages.dispMobSubmitBut = "custom submitButton for mobile being used";
returnListFunctions.dispMobSubmitBut = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if ((((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).dialog || {}).submitButton || "Submit") != "Submit"){
        // console.log('submitButton',jconfig.trigger.surveydefs[def].display.mobile[0].dialog.submitButton)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobTxtDisc");
returnListArrays.dispMobTxtDisc = [];
returnListMessages.dispMobTxtDisc = "custom textDisclaimer for mobile being used";
returnListFunctions.dispMobTxtDisc = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        (((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).dialog || {}).textDisclaimer || "Providing your number means you are participating in a ForeSee survey. Message &amp; data rates may apply. 2 messages per survey.") != "Providing your number means you are participating in a ForeSee survey. Message &amp; data rates may apply. 2 messages per survey." &&
        (((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).dialog || {}).textDisclaimer || "Providing your number means you are participating in a ForeSee survey. Message &amp; data rates may apply. 1 message per survey.") != "Providing your number means you are participating in a ForeSee survey. Message &amp; data rates may apply. 1 message per survey."
      ){
        // console.log('textDisclaimer',jconfig.trigger.surveydefs[def].display.mobile[0].dialog.textDisclaimer)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobEmailDisc");
returnListArrays.dispMobEmailDisc = [];
returnListMessages.dispMobEmailDisc = "custom emailDisclaimer for mobile being used";
returnListFunctions.dispMobEmailDisc = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if ((((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).dialog || {}).emailDisclaimer || "") != ""){
        // console.log('emailDisclaimer',jconfig.trigger.surveydefs[def].display.mobile[0].dialog.emailDisclaimer)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobTACTxt");
returnListArrays.dispMobTACTxt = [];
returnListMessages.dispMobTACTxt = "custom termsAndConditionsText for mobile being used";
returnListFunctions.dispMobTACTxt = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if ((((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).dialog || {}).termsAndConditionsText || "SMS Disclosure") != "SMS Disclosure"){
        // console.log('termsAndConditionsText',jconfig.trigger.surveydefs[def].display.mobile[0].dialog.termsAndConditionsText)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobTACLink");
returnListArrays.dispMobTACLink = [];
returnListMessages.dispMobTACLink = "custom termsAndConditionsLink for mobile being used";
returnListFunctions.dispMobTACLink = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if ((((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).dialog || {}).termsAndConditionsLink || "https://www.foresee.com/sms-terms-and-conditions/") != "https://www.foresee.com/sms-terms-and-conditions/"){
        // console.log('termsAndConditionsLink',jconfig.trigger.surveydefs[def].display.mobile[0].dialog.termsAndConditionsLink)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobPPTxt");
returnListArrays.dispMobPPTxt = [];
returnListMessages.dispMobPPTxt = "custom privacyPolicyText for mobile being used";
returnListFunctions.dispMobPPTxt = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if ((((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).dialog || {}).privacyPolicyText || "Privacy Policy") != "Privacy Policy"){
        // console.log('privacyPolicyText',jconfig.trigger.surveydefs[def].display.mobile[0].dialog.privacyPolicyText)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobPPLink");
returnListArrays.dispMobPPLink = [];
returnListMessages.dispMobPPLink = "custom privacyPolicyLink for mobile being used";
returnListFunctions.dispMobPPLink = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        (((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).dialog || {}).privacyPolicyLink || "https://www.foresee.com/privacy-policy/") != "https://www.foresee.com/privacy-policy/" &&
        (((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).dialog || {}).privacyPolicyLink || "http://www.foresee.com/sms-terms-and-conditions") != "http://www.foresee.com/sms-terms-and-conditions" &&
        (((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).dialog || {}).privacyPolicyLink || "//www.foresee.com/privacy-policy/") != "//www.foresee.com/privacy-policy/" &&
        (((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).dialog || {}).privacyPolicyLink || "http://www.foresee.com/about-us/privacy-policy/") != "http://www.foresee.com/about-us/privacy-policy/"
      ){
        // console.log('privacyPolicyLink',jconfig.trigger.surveydefs[def].display.mobile[0].dialog.privacyPolicyLink)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobEmailErr");
returnListArrays.dispMobEmailErr = [];
returnListMessages.dispMobEmailErr = "custom emailInvalidation for mobile being used";
returnListFunctions.dispMobEmailErr = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        (((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).dialog || {}).emailInvalidation || "Error: Please enter a valid email") != "Error: Please enter a valid email" &&
        (((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).dialog || {}).emailInvalidation || "Please enter a valid email") != "Please enter a valid email"
      ){
        // console.log('emailInvalidation',jconfig.trigger.surveydefs[def].display.mobile[0].dialog.emailInvalidation)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobTxtErr");
returnListArrays.dispMobTxtErr = [];
returnListMessages.dispMobTxtErr = "custom textInvalidation for mobile being used";
returnListFunctions.dispMobTxtErr = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        (((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).dialog || {}).textInvalidation || "Error: Please enter a valid cellphone number") != "Error: Please enter a valid cellphone number" &&
        (((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).dialog || {}).textInvalidation || "Please enter a valid cellphone number") != "Please enter a valid cellphone number"
      ){
        // console.log('textInvalidation',jconfig.trigger.surveydefs[def].display.mobile[0].dialog.textInvalidation)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobOnExitHL");
returnListArrays.dispMobOnExitHL = [];
returnListMessages.dispMobOnExitHL = "custom onexitheadline for mobile being used";
returnListFunctions.dispMobOnExitHL = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if ((((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).dialog || {}).onexitheadline || "Thank you!") != "Thank you!"){
        // console.log('onexitheadline',jconfig.trigger.surveydefs[def].display.mobile[0].dialog.onexitheadline)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobOnExitSubHL");
returnListArrays.dispMobOnExitSubHL = [];
returnListMessages.dispMobOnExitSubHL = "custom onexitsubheadline for mobile being used";
returnListFunctions.dispMobOnExitSubHL = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if ((((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).dialog || {}).onexitsubheadline || "We'll reach out to you after you finish on our site.") != "We'll reach out to you after you finish on our site."){
        // console.log('onexitsubheadline',jconfig.trigger.surveydefs[def].display.mobile[0].dialog.onexitsubheadline)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobOnExitCountTxt");
returnListArrays.dispMobOnExitCountTxt = [];
returnListMessages.dispMobOnExitCountTxt = "custom onexitcountertag for mobile being used";
returnListFunctions.dispMobOnExitCountTxt = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if ((((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).dialog || {}).onexitcountertag || "Returning in ") != "Returning in "){
        // console.log('onexitcountertag',jconfig.trigger.surveydefs[def].display.mobile[0].dialog.onexitcountertag)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobOnExitCountNum");
returnListArrays.dispMobOnExitCountNum = [];
returnListMessages.dispMobOnExitCountNum = "custom onexitcounterval for mobile being used";
returnListFunctions.dispMobOnExitCountNum = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if (
        (((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).dialog || {}).onexitcounterval || "7") != "7" &&
        (((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).dialog || {}).onexitcounterval || "3") != "3"
      ){
        // console.log('onexitcounterval',jconfig.trigger.surveydefs[def].display.mobile[0].dialog.onexitcounterval)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobTheme");
returnListArrays.dispMobTheme = [];
returnListMessages.dispMobTheme = "custom theme for mobile being used";
returnListFunctions.dispMobTheme = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if ((((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).dialog || {}).theme || "main") != "main"){
        // console.log('theme',jconfig.trigger.surveydefs[def].display.mobile[0].dialog.theme)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobStyFont");
returnListArrays.dispMobStyFont = [];
returnListMessages.dispMobStyFont = "custom font for mobile style being used";
returnListFunctions.dispMobStyFont = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if ((((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).style || {}).font || "") != ""){
        // console.log('font',jconfig.trigger.surveydefs[def].display.mobile[0].style.font)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobStyBGColor");
returnListArrays.dispMobStyBGColor = [];
returnListMessages.dispMobStyBGColor = "custom backgroundColor for mobile style being used";
returnListFunctions.dispMobStyBGColor = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if ((((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).style || {}).backgroundColor || "") != ""){
        // console.log('backgroundColor',jconfig.trigger.surveydefs[def].display.mobile[0].style.backgroundColor)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobStyShadowColor");
returnListArrays.dispMobStyShadowColor = [];
returnListMessages.dispMobStyShadowColor = "custom shadowColor for mobile style being used";
returnListFunctions.dispMobStyShadowColor = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if ((((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).style || {}).shadowColor || "") != ""){
        // console.log('shadowColor',jconfig.trigger.surveydefs[def].display.mobile[0].style.shadowColor)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobStyPrivBGColor");
returnListArrays.dispMobStyPrivBGColor = [];
returnListMessages.dispMobStyPrivBGColor = "custom privacyBackgroundColor for mobile style being used";
returnListFunctions.dispMobStyPrivBGColor = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if ((((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).style || {}).privacyBackgroundColor || "") != ""){
        // console.log('privacyBackgroundColor',jconfig.trigger.surveydefs[def].display.mobile[0].style.privacyBackgroundColor)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobStyFSBGColor");
returnListArrays.dispMobStyFSBGColor = [];
returnListMessages.dispMobStyFSBGColor = "custom fullScreenBackgroundColor for mobile style being used";
returnListFunctions.dispMobStyFSBGColor = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if ((((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).style || {}).fullScreenBackgroundColor || "") != ""){
        // console.log('fullScreenBackgroundColor',jconfig.trigger.surveydefs[def].display.mobile[0].style.fullScreenBackgroundColor)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobStyInvLogoSwitch");
returnListArrays.dispMobStyInvLogoSwitch = [];
returnListMessages.dispMobStyInvLogoSwitch = "custom logoSwitch for mobile style being used";
returnListFunctions.dispMobStyInvLogoSwitch = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if (((((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).style || {}).invite || {}).logoSwitch || false) != false){
        // console.log('logoSwitch',jconfig.trigger.surveydefs[def].display.mobile[0].style.invite.logoSwitch)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobStyInvTxtColor");
returnListArrays.dispMobStyInvTxtColor = [];
returnListMessages.dispMobStyInvTxtColor = "custom textColor for mobile style being used";
returnListFunctions.dispMobStyInvTxtColor = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if (((((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).style || {}).invite || {}).textColor || "") != ""){
        // console.log('textColor',jconfig.trigger.surveydefs[def].display.mobile[0].style.invite.textColor)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobStyInvSmsButTxtColor");
returnListArrays.dispMobStyInvSmsButTxtColor = [];
returnListMessages.dispMobStyInvSmsButTxtColor = "custom smsButtonTextColor for mobile style being used";
returnListFunctions.dispMobStyInvSmsButTxtColor = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if (((((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).style || {}).invite || {}).smsButtonTextColor || "") != ""){
        // console.log('smsButtonTextColor',jconfig.trigger.surveydefs[def].display.mobile[0].style.invite.smsButtonTextColor)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobStyInvSmsButBGColor");
returnListArrays.dispMobStyInvSmsButBGColor = [];
returnListMessages.dispMobStyInvSmsButBGColor = "custom smsButtonBackgroundColor for mobile style being used";
returnListFunctions.dispMobStyInvSmsButBGColor = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if (((((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).style || {}).invite || {}).smsButtonBackgroundColor || "") != ""){
        // console.log('smsButtonBackgroundColor',jconfig.trigger.surveydefs[def].display.mobile[0].style.invite.smsButtonBackgroundColor)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobStyInvEmailButTxtColor");
returnListArrays.dispMobStyInvEmailButTxtColor = [];
returnListMessages.dispMobStyInvEmailButTxtColor = "custom emailButtonTextColor for mobile style being used";
returnListFunctions.dispMobStyInvEmailButTxtColor = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if (((((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).style || {}).invite || {}).emailButtonTextColor || "") != ""){
        // console.log('emailButtonTextColor',jconfig.trigger.surveydefs[def].display.mobile[0].style.invite.emailButtonTextColor)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobStyInvEmailButBGColor");
returnListArrays.dispMobStyInvEmailButBGColor = [];
returnListMessages.dispMobStyInvEmailButBGColor = "custom emailButtonBackgroundColor for mobile style being used";
returnListFunctions.dispMobStyInvEmailButBGColor = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if (((((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).style || {}).invite || {}).emailButtonBackgroundColor || "") != ""){
        // console.log('emailButtonBackgroundColor',jconfig.trigger.surveydefs[def].display.mobile[0].style.invite.emailButtonBackgroundColor)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobStyInvXColor");
returnListArrays.dispMobStyInvXColor = [];
returnListMessages.dispMobStyInvXColor = "custom xColor for mobile style being used";
returnListFunctions.dispMobStyInvXColor = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if (((((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).style || {}).invite || {}).xColor || "") != ""){
        // console.log('xColor',jconfig.trigger.surveydefs[def].display.mobile[0].style.invite.xColor)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobStyInvXBGColor");
returnListArrays.dispMobStyInvXBGColor = [];
returnListMessages.dispMobStyInvXBGColor = "custom xBackgroundColor for mobile style being used";
returnListFunctions.dispMobStyInvXBGColor = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if (((((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).style || {}).invite || {}).xBackgroundColor || "") != ""){
        // console.log('xBackgroundColor',jconfig.trigger.surveydefs[def].display.mobile[0].style.invite.xBackgroundColor)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobStyInvXBorderRad");
returnListArrays.dispMobStyInvXBorderRad = [];
returnListMessages.dispMobStyInvXBorderRad = "custom xBorderRadius for mobile style being used";
returnListFunctions.dispMobStyInvXBorderRad = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if (((((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).style || {}).invite || {}).xBorderRadius || "") != ""){
        // console.log('xBorderRadius',jconfig.trigger.surveydefs[def].display.mobile[0].style.invite.xBorderRadius)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobStyInvButBorderRad");
returnListArrays.dispMobStyInvButBorderRad = [];
returnListMessages.dispMobStyInvButBorderRad = "custom buttonBorderRadius for mobile style being used";
returnListFunctions.dispMobStyInvButBorderRad = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if (((((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).style || {}).invite || {}).buttonBorderRadius || "") != ""){
        // console.log('buttonBorderRadius',jconfig.trigger.surveydefs[def].display.mobile[0].style.invite.buttonBorderRadius)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobStyInvButShadowColor");
returnListArrays.dispMobStyInvButShadowColor = [];
returnListMessages.dispMobStyInvButShadowColor = "custom buttonShadowColor for mobile style being used";
returnListFunctions.dispMobStyInvButShadowColor = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if (((((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).style || {}).invite || {}).buttonShadowColor || "") != ""){
        // console.log('buttonShadowColor',jconfig.trigger.surveydefs[def].display.mobile[0].style.invite.buttonShadowColor)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobStyInvButDisTxtColor");
returnListArrays.dispMobStyInvButDisTxtColor = [];
returnListMessages.dispMobStyInvButDisTxtColor = "custom buttonDisabledTextColor for mobile style being used";
returnListFunctions.dispMobStyInvButDisTxtColor = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if (((((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).style || {}).invite || {}).buttonDisabledTextColor || "") != ""){
        // console.log('buttonDisabledTextColor',jconfig.trigger.surveydefs[def].display.mobile[0].style.invite.buttonDisabledTextColor)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobStyInvButDisBGColor");
returnListArrays.dispMobStyInvButDisBGColor = [];
returnListMessages.dispMobStyInvButDisBGColor = "custom buttonDisabledBackgroundColor for mobile style being used";
returnListFunctions.dispMobStyInvButDisBGColor = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if (((((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).style || {}).invite || {}).buttonDisabledBackgroundColor || "") != ""){
        // console.log('buttonDisabledBackgroundColor',jconfig.trigger.surveydefs[def].display.mobile[0].style.invite.buttonDisabledBackgroundColor)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobStyInvErrColor");
returnListArrays.dispMobStyInvErrColor = [];
returnListMessages.dispMobStyInvErrColor = "custom invalidColor for mobile style being used";
returnListFunctions.dispMobStyInvErrColor = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if (((((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).style || {}).invite || {}).invalidColor || "") != ""){
        // console.log('invalidColor',jconfig.trigger.surveydefs[def].display.mobile[0].style.invite.invalidColor)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobStyPreSet");
returnListArrays.dispMobStyPreSet = [];
returnListMessages.dispMobStyPreSet = "custom presetStyles for mobile style being used";
returnListFunctions.dispMobStyPreSet = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if ((((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).style || {}).presetStyles || "") != ""){
        // console.log('presetStyles',jconfig.trigger.surveydefs[def].display.mobile[0].style.presetStyles)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("dispMobStyCustBlock");
returnListArrays.dispMobStyCustBlock = [];
returnListMessages.dispMobStyCustBlock = "custom customStyleBlock for mobile style being used";
returnListFunctions.dispMobStyCustBlock = async function (sitekey,container) {
	let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if ((((((jconfig.trigger.surveydefs[def].display || {}).mobile || [])[0] || {}).style || {}).customStyleBlock || "") != ""){
        // console.log('presetStyles',jconfig.trigger.surveydefs[def].display.mobile[0].style.customStyleBlock)
        return true;
			}
		}
	}
	return false;
}

returnListThings.push("hasQualPage");
returnListArrays.hasQualPage = [];
returnListMessages.hasQualPage = "a qualifier page being used";
returnListFunctions.hasQualPage = async function (sitekey,container) {
  let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if ((jconfig.trigger.surveydefs[def].qualifier || {}).useQualifier){
        return true;
      }
    }
  }
  return false;
}

returnListThings.push("hasReminder");
returnListArrays.hasReminder = [];
returnListMessages.hasReminder = "a reminder being used";
returnListFunctions.hasReminder = async function (sitekey,container) {
  let jconfig = await filesystem.readFileToObjectIfExists(`${path}${sitekey}/${container}/config.json`);
  if (((jconfig || {}).trigger || {}).surveydefs) {
    for (def in jconfig.trigger.surveydefs) {
      if ((jconfig.trigger.surveydefs[def].reminder || {}).useReminder){
        return true;
      }
    }
  }
  return false;
}
