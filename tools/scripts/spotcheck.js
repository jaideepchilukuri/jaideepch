const magic = require("../magic.js"),
  filesystem = require("../scripts/filesystem").default,
  fcp = require("../scripts/FCPvals"),
  other = require("../scripts/other");

function findCustomerKeyFromCustomerId(customerId) {
  //let customerKey = JSON.parse(other.httpRequest('GET',`https://fsrsupport.foresee.com/api/cust/select?cid=${customerId}`).getBody('utf8')); might work to replace next three lines
  let customerKey = other.httpRequest(
    "GET",
    `https://fsrsupport.foresee.com/api/cust/select?cid=${customerId}`
  );
  customerKey = customerKey.getBody("utf8");
  customerKey = JSON.parse(customerKey);
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

function findCustomerIdFromCustomerKey(customerKey) {
  let customerId = other.httpRequest(
    "GET",
    `https://fsrsupport.foresee.com/api/cust/select?cid=${customerKey}`
  );
  customerId = customerId.getBody("utf8");
  customerId = JSON.parse(customerId);
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

function findCustomerKeyFromSiteKey(siteKey) {
  let customerKey = other.httpRequest(
    "GET",
    `https://fcp.foresee.com/sites/${siteKey}`,
    {
      headers: {
        authorization: fcp.fcpROCreds
      }
    }
  );
  customerKey = customerKey.getBody("utf8");
  customerKey = JSON.parse(customerKey);
  if (
    customerKey &&
    customerKey.message &&
    customerKey.message[0] &&
    customerKey.message[0].client_id
  ) {
    return customerKey.message[0].client_id;
  }
  return null;
}

async function checkCustomerKey(path) {
  // console.log("Checking Customer Key...");
  let jconfig = await magic.readFile(path);
  return new Promise(function(resolve, reject) {
    if (!jconfig.global) {
      jconfig.global = {};
    }
    let ckey = null;
    if (jconfig.global.customerKey) {
      ckey = jconfig.global.customerKey;
    }
    if (!ckey && jconfig.global.customerId) {
      ckey = findCustomerKeyFromCustomerId(jconfig.global.customerId);
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
        ckey = findCustomerKeyFromSiteKey(sitekey);
      }
    }
    if (!ckey) {
      ckey = other.askQuestion(
        "Customer key is missing. What is the customer key for this sitekey? "
      );
    }
    // console.log(ckey)
    jconfig.global.customerKey = ckey;
    let jconfigFile = JSON.stringify(jconfig);
    filesystem.writeToFile(path, jconfigFile);
    return resolve();
  });
}

async function checkCodeVersion(path) {
  // console.log("Checking Code Version...");
  let jconfig = await magic.readFile(path);
  return new Promise(function(resolve, reject) {
    if (!jconfig.global) {
      jconfig.global = {};
    }
    if (!jconfig.global.codeVer) {
      let packagejson = filesystem.readFileToStringIfExists(
        path.slice(0, -12) + "/CC/package.json"
      );
      packagejson = JSON.parse(packagejson);
      if (packagejson && packagejson.version) {
        jconfig.global.codeVer = packagejson.version;
      }
    }
    while (
      !jconfig.global.codeVer ||
      !filesystem.checkIfFileOrDirExists(
        `./tools/EJS/${jconfig.global.codeVer}`
      )
    ) {
      let cVer = other.askQuestion(
        `Code version is missing or there's no template to build it. What other code version do you want to build? `
      );
      if (!cVer || cVer == null || cVer == "") {
        return reject(
          "Code Version " +
            jconfig.global.codeVer +
            " is not currently supported, unless you just need to fetch in the new updates from github. Please reach out to support@foresee.com if you have any questions. Thank you come again."
        );
      }
      jconfig.global.codeVer = cVer;
    }
    let jconfigFile = JSON.stringify(jconfig);
    filesystem.writeToFile(path, jconfigFile);
    return resolve();
  });
}

async function checkSiteKey(path) {
  // console.log("Checking Site Key...");
  let jconfig = await magic.readFile(path);
  return new Promise(function(resolve, reject) {
    if (!jconfig.global) {
      jconfig.global = {};
    }
    if (!jconfig.global.siteKey) {
      let skey = path.split("/");
      jconfig.global.siteKey = skey[skey.length - 2];
    }
    let jconfigFile = JSON.stringify(jconfig);
    filesystem.writeToFile(path, jconfigFile);
    return resolve();
  });
}

async function checkCustomerId(path) {
  // console.log("Checking Customer Id...");
  let jconfig = await magic.readFile(path);
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
        cid = findCustomerIdFromCustomerKey(
          findCustomerKeyFromSiteKey(sitekey)
        );
      }
    }
    if (!cid) {
      cid = other.askQuestion(
        "Customer key is missing. What is the customer key for this sitekey? "
      );
    }
    // console.log(cid)
    jconfig.global.customerKey = cid;
    let jconfigFile = JSON.stringify(jconfig);
    filesystem.writeToFile(path, jconfigFile);
    return resolve();
  });
}

async function checkCPP(path) {
  // console.log("Checking CPPs..");
  let jconfig = await magic.readFile(path);
  return new Promise(function(resolve, reject) {
    if (
      jconfig &&
      jconfig.trigger &&
      jconfig.trigger.config &&
      jconfig.trigger.config.cpps
    ) {
      for (cpp in jconfig.trigger.config.cpps) {
        if (
          jconfig.trigger.config.cpps[cpp].source == "cookie" &&
          jconfig.trigger.config.cpps[cpp].name
        ) {
          jconfig.trigger.config.cpps[cpp].val =
            jconfig.trigger.config.cpps[cpp].name;
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
  let jconfig = await magic.readFile(path);
  return new Promise(function(resolve, reject) {
    if (jconfig && jconfig.trigger && jconfig.trigger.surveydefs) {
      let newUID = other.httpRequest(
        "GET",
        `https://www.uuidgenerator.net/api/version4/${
          jconfig.trigger.surveydefs.length
        }`
      );
      newUID = newUID.getBody("utf8");
      for (def of jconfig.trigger.surveydefs) {
        if (!def.uid) {
          // console.log(newUID);
          def["uid"] = newUID.substring(0, 36);
          newUID = newUID.substring(38, newUID.length);
        }
      }
      let jconfigFile = JSON.stringify(jconfig);
      filesystem.writeToFile(path, jconfigFile);
    }
    return resolve();
  });
}

async function checkLegacyDisplay(path) {
  //console.log("Checking Displays For Legacy..");
  let jconfig = await magic.readFile(path);
  let codeVersion = null;
  if (jconfig && jconfig.global && jconfig.global.codeVer) {
    codeVersion = jconfig.global.codeVer;
    return new Promise(function(resolve, reject) {
      if (
        codeVersion == "19.3.0" ||
        codeVersion == "19.3.1" ||
        codeVersion == "19.3.2" ||
        codeVersion == "19.3.2-v.2" ||
        codeVersion == "19.3.2-v.3" ||
        codeVersion == "19.3.3" ||
        codeVersion == "19.3.3-v.2" ||
        codeVersion == "19.3.3-v.3" ||
        codeVersion == "19.3.4" ||
        codeVersion == "19.3.5" ||
        codeVersion == "19.3.6" ||
        codeVersion == "19.3.7" ||
        codeVersion == "19.3.7-hf.1" ||
        codeVersion == "19.4.0" ||
        codeVersion == "19.4.1" ||
        codeVersion == "19.4.2" ||
        codeVersion == "19.4.3" ||
        codeVersion == "19.4.4" ||
        codeVersion == "19.5.0" ||
        codeVersion == "19.5.1" ||
        codeVersion == "19.5.2" ||
        codeVersion == "19.6.0" ||
        codeVersion == "19.6.1" ||
        codeVersion == "19.6.2" ||
        codeVersion == "19.6.3" ||
        codeVersion == "19.6.4" ||
        codeVersion == "19.6.5" ||
        codeVersion == "19.6.6" ||
        codeVersion == "19.6.7" ||
        codeVersion == "19.6.8"
      ) {
        if (jconfig && jconfig.trigger && jconfig.trigger.surveydefs) {
          for (var def of jconfig.trigger.surveydefs) {
            if (def.criteria.supportsDesktop) {
              if (
                !def.display ||
                !def.display.desktop ||
                !def.display.desktop[0] ||
                !def.display.desktop[0].displayname
              ) {
                def.display.desktop[0].displayname = "default";
              }
              if (!def.display.desktop[0].template) {
                def.display.desktop[0].template = "classicdesktop";
              }
              if (!def.display.desktop[0].vendorTitleText) {
                def.display.desktop[0].vendorTitleText = "ForeSee";
              }
              if (!def.display.desktop[0].vendorAltText) {
                def.display.desktop[0].vendorAltText = "ForeSee";
              }
              if (!def.display.desktop[0].hideForeSeeLogoDesktop) {
                def.display.desktop[0].hideForeSeeLogoDesktop = "false";
              }
              if (
                !def.display.desktop[0].dialog ||
                !def.display.desktop[0].dialog.blurb
              ) {
                def.display.desktop[0].dialog.blurb =
                  "Thank you for visiting our website. You have been selected to participate in a brief customer satisfaction survey to let us know how we can improve your experience.";
              }
              if (!def.display.desktop[0].dialog.noticeAboutSurvey) {
                def.display.desktop[0].dialog.noticeAboutSurvey =
                  "The survey is designed to measure your entire experience, please look for it at the <u>conclusion</u> of your visit.";
              }
              if (!def.display.desktop[0].dialog.attribution) {
                def.display.desktop[0].dialog.attribution =
                  "This survey is conducted by an independent company ForeSee, on behalf of the site you are visiting.";
              }
              if (!def.display.desktop[0].dialog.trackerTitle) {
                def.display.desktop[0].dialog.trackerTitle =
                  "ForeSee - Survey Tracker Window";
              }
              if (!def.display.desktop[0].dialog.trackerClickToView) {
                def.display.desktop[0].dialog.trackerClickToView =
                  "Click to view the survey.";
              }
              if (!def.display.desktop[0].dialog.trackerPlsLeaveOpen) {
                def.display.desktop[0].dialog.trackerPlsLeaveOpen =
                  "Please leave this window open.";
              }
              if (!def.display.desktop[0].dialog.trackerAtEnd) {
                def.display.desktop[0].dialog.trackerAtEnd =
                  "At the end of your session, click here to begin the survey.";
              }
              if (!def.display.desktop[0].dialog.trackerDesc1) {
                def.display.desktop[0].dialog.trackerDesc1 =
                  "It is part of the customer satisfaction survey you agreed to take on this site. You may click here when ready to complete the survey, although it should activate on its own after a few moments when you have left the site.";
              }
              if (!def.display.desktop[0].dialog.trackerDesc2) {
                def.display.desktop[0].dialog.trackerDesc2 =
                  "Please leave this window open until you have completed your time on this site. This window is part of the customer satisfaction survey you agreed to take on this site. You may click here when ready to complete the survey, although it should activate on its own after a few moments when you have left the site.";
              }
              if (!def.display.desktop[0].dialog.trackerDesc3) {
                def.display.desktop[0].dialog.trackerDesc3 =
                  "Thank you for helping us improve your website experience. This survey is conducted by an independent company, ForeSee, on behalf of the site you visited.";
              }
              if (!def.display.desktop[0].dialog.trackerCorp) {
                def.display.desktop[0].dialog.trackerCorp =
                  "ForeSee. All rights reserved.";
              }
              if (!def.display.desktop[0].dialog.trackerPrivacy) {
                def.display.desktop[0].dialog.trackerPrivacy = "Privacy";
              }
            }
          }
          let jconfigFile = JSON.stringify(jconfig);
          filesystem.writeToFile(path, jconfigFile);
        }
      }
      return resolve(jconfig);
    });
  } else {
    console.log("Code version not defined in config.json!");
  }
  return;
}

async function checkTemplates(path) {
  //console.log("Checking Templates For Customs..");
  let jconfig = await magic.readFile(path);
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
          `WARNING! Def ${counter} has custom desktop template '${
            def.display.desktop[0].template
          }'! #DO_SOMETHING!`
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
          `WARNING! Def ${counter} has custom mobile template '${
            def.display.mobile[0].template
          }'! #DO_SOMETHING!`
        );
      }
      counter++;
    }
  }
}

async function checkBlacklistFalse(path) {
  //console.log("Checking Record For Blacklist Active Set To False...");
  let jconfig = await magic.readFile(path);
  return new Promise(function(resolve, reject) {
    if (
      jconfig &&
      jconfig.record &&
      jconfig.record.blacklist &&
      jconfig.record.blacklist.active == false
    ) {
      console.log(
        "Record Blacklist Active Set To False, Deleting This Blacklist: ",
        jconfig.record.blacklist
      );
      delete jconfig.record.blacklist;
      let jconfigFile = JSON.stringify(jconfig);
      filesystem.writeToFile(path, jconfigFile);
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
  checkTemplates,
  checkBlacklistFalse
};
