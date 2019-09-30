const fs = require("fs"),
  unzip = require("unzip-stream"),
  ejs = require("ejs"),
  gitsync = require("./scripts/node-gitsync.js"),
  spotcheck = require("./scripts/spotcheck"),
  filesystem = require("./scripts/filesystem"),
  fcp = require("./scripts/FCPvals"),
  other = require("./scripts/other");
let jconfig;

const cctVersions = [
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
  "19.6.0",
  "19.6.1",
  "19.6.2",
  "19.6.3",
  "19.6.4",
  "19.6.5",
  "19.6.6",
  "19.6.7",
  "19.6.8",
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
  "19.8.7"
];

async function fullDefection(path) {
  jconfig = await readFile(path + "/config.json");
  return new Promise(function(resolve, reject) {
    if (
      jconfig &&
      jconfig.trigger &&
      jconfig.trigger.surveydefs &&
      jconfig.trigger.surveydefs.length > 0
    ) {
      for (
        let counter = 0;
        counter < jconfig.trigger.surveydefs.length;
        counter++
      ) {
        if (!jconfig.trigger.surveydefs[counter].mouseoff) {
          jconfig.trigger.surveydefs[counter].mouseoff = {};
        }
        if (!jconfig.trigger.surveydefs[counter].mouseoff.sp) {
          jconfig.trigger.surveydefs[counter].mouseoff.sp = {};
        }
        jconfig.trigger.surveydefs[counter].mouseoff.sp.reg = "-1";
        if (!jconfig.trigger.surveydefs[counter].criteria) {
          jconfig.trigger.surveydefs[counter].criteria = {};
        }
        if (!jconfig.trigger.surveydefs[counter].criteria.sp) {
          jconfig.trigger.surveydefs[counter].criteria.sp = {};
        }
        jconfig.trigger.surveydefs[counter].criteria.sp.reg = "-1";
      }
      jconfig = JSON.stringify(jconfig);
      filesystem.writeToFile(path + "/config.json", jconfig);
      console.log("Updated code version in config.json to " + codeVersion);
    }
    return resolve(true);
  });
}

async function updateToModernInvite(path) {
  jconfig = await readFile(path + "/config.json");
  return new Promise(function(resolve, reject) {
    if (
      jconfig &&
      jconfig.trigger &&
      jconfig.trigger.surveydefs &&
      jconfig.trigger.surveydefs.length > 0
    ) {
      for (var def of jconfig.trigger.surveydefs) {
        if (
          def.criteria &&
          def.criteria.supportsDesktop &&
          def.display &&
          def.display.desktop &&
          def.display.desktop[0]
        ) {
          if (
            def.display.desktop[0].displayname &&
            def.display.desktop[0].displayname == "default"
          ) {
            delete def.display.desktop[0].displayname;
          }
          if (
            def.display.desktop[0].template &&
            def.display.desktop[0].template == "classicdesktop"
          ) {
            delete def.display.desktop[0].template;
          }
          if (
            def.display.desktop[0].vendorTitleText &&
            def.display.desktop[0].vendorTitleText == "ForeSee"
          ) {
            delete def.display.desktop[0].vendorTitleText;
          }
          if (
            def.display.desktop[0].vendorAltText &&
            def.display.desktop[0].vendorAltText == "ForeSee"
          ) {
            delete def.display.desktop[0].vendorAltText;
          }
          if (
            def.display.desktop[0].hideForeSeeLogoDesktop &&
            def.display.desktop[0].hideForeSeeLogoDesktop == "false"
          ) {
            delete def.display.desktop[0].hideForeSeeLogoDesktop;
          }
          if (def.display.desktop[0].dialog) {
            if (
              def.display.desktop[0].dialog.blurb &&
              def.display.desktop[0].dialog.blurb ==
                "Thank you for visiting our website. You have been selected to participate in a brief customer satisfaction survey to let us know how we can improve your experience."
            ) {
              delete def.display.desktop[0].dialog.blurb;
            }
            if (
              def.display.desktop[0].dialog.noticeAboutSurvey &&
              def.display.desktop[0].dialog.noticeAboutSurvey ==
                "The survey is designed to measure your entire experience, please look for it at the <u>conclusion</u> of your visit."
            ) {
              delete def.display.desktop[0].dialog.noticeAboutSurvey;
            }
            if (
              def.display.desktop[0].dialog.attribution &&
              def.display.desktop[0].dialog.attribution ==
                "This survey is conducted by an independent company ForeSee, on behalf of the site you are visiting."
            ) {
              delete def.display.desktop[0].dialog.attribution;
            }
            if (
              def.display.desktop[0].dialog.trackerTitle &&
              def.display.desktop[0].dialog.trackerTitle ==
                "ForeSee - Survey Tracker Window"
            ) {
              delete def.display.desktop[0].dialog.trackerTitle;
            }
            if (
              def.display.desktop[0].dialog.trackerClickToView &&
              def.display.desktop[0].dialog.trackerClickToView ==
                "Click to view the survey."
            ) {
              delete def.display.desktop[0].dialog.trackerClickToView;
            }
            if (
              def.display.desktop[0].dialog.trackerPlsLeaveOpen &&
              def.display.desktop[0].dialog.trackerPlsLeaveOpen ==
                "Please leave this window open."
            ) {
              delete def.display.desktop[0].dialog.trackerPlsLeaveOpen;
            }
            if (
              def.display.desktop[0].dialog.trackerAtEnd &&
              def.display.desktop[0].dialog.trackerAtEnd ==
                "At the end of your session, click here to begin the survey."
            ) {
              delete def.display.desktop[0].dialog.trackerAtEnd;
            }
            if (
              def.display.desktop[0].dialog.trackerDesc1 &&
              def.display.desktop[0].dialog.trackerDesc1 ==
                "It is part of the customer satisfaction survey you agreed to take on this site. You may click here when ready to complete the survey, although it should activate on its own after a few moments when you have left the site."
            ) {
              delete def.display.desktop[0].dialog.trackerDesc1;
            }
            if (
              def.display.desktop[0].dialog.trackerDesc2 &&
              def.display.desktop[0].dialog.trackerDesc2 ==
                "Please leave this window open until you have completed your time on this site. This window is part of the customer satisfaction survey you agreed to take on this site. You may click here when ready to complete the survey, although it should activate on its own after a few moments when you have left the site."
            ) {
              delete def.display.desktop[0].dialog.trackerDesc2;
            }
            if (
              def.display.desktop[0].dialog.trackerDesc3 &&
              def.display.desktop[0].dialog.trackerDesc3 ==
                "Thank you for helping us improve your website experience. This survey is conducted by an independent company, ForeSee, on behalf of the site you visited."
            ) {
              delete def.display.desktop[0].dialog.trackerDesc3;
            }
            if (
              def.display.desktop[0].dialog.trackerCorp &&
              def.display.desktop[0].dialog.trackerCorp ==
                "ForeSee. All rights reserved."
            ) {
              delete def.display.desktop[0].dialog.trackerCorp;
            }
            if (
              def.display.desktop[0].dialog.trackerPrivacy &&
              def.display.desktop[0].dialog.trackerPrivacy == "Privacy"
            ) {
              delete def.display.desktop[0].dialog.trackerPrivacy;
            }
          }
          console.log(JSON.stringify(def.display.desktop[0].dialog));
          if (
            JSON.stringify(def.display.desktop[0].dialog) == "{}" ||
            def.display.desktop[0].dialog == undefined
          ) {
            delete def.display.desktop[0].dialog;
          }
          console.log(JSON.stringify(def.display.desktop[0]));
          if (
            JSON.stringify(def.display.desktop[0]) == "{}" ||
            def.display.desktop[0] == undefined
          ) {
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
  jconfig = await readFile(path + "/config.json");
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
    if (config && config.global && config.global.codeVer)
      codeVersion = config.global.codeVer;
    return resolve(codeVersion);
  });
}

async function addEmptyDefs(customObj, emptyObj) {
  let emptyDef = emptyObj.trigger.surveydefs[0];
  emptyObj.trigger.surveydefs = [];
  if (
    customObj &&
    customObj.trigger &&
    customObj.trigger.surveydefs &&
    customObj.trigger.surveydefs.length > 0
  ) {
    for (var def in customObj.trigger.surveydefs) {
      //console.log(def)
      emptyObj.trigger.surveydefs.push(emptyDef);
    }
  }
  //console.log(emptyObj.trigger.surveydefs)
  return emptyObj;
}

async function unbaseDefs(Obj) {
  let retObj = Obj;
  for (var def in retObj.trigger.surveydefs) {
    var tempDef = {};
    eval("tempDef=" + other.aTob(retObj.trigger.surveydefs[def]));
    //console.log(typeof tempDef, tempDef)
    retObj.trigger.surveydefs[def] = tempDef;
  }
  //console.log(retObj.trigger.surveydefs)
  return retObj;
}

async function returnEmptyConfig(codeVersion) {
  let codeVersionWithDashes = codeVersion.replace(/\./g, "-");
  //make the call to the url to retrieve the empty config
  let resp = other.httpRequest(
    "GET",
    `https://gateway-elb.foresee.com/sites/emptyconfigs/${codeVersionWithDashes}/config.json`
  );
  let respbody = resp.getBody("utf8");
  respbody = JSON.parse(respbody);
  respbody = await addEmptyDefs(jconfig, respbody);
  // should come back and fix this to use semVer https://www.npmjs.com/package/semver
  if (cctVersions.includes(codeVersion)) {
    // unbase64 the surveydefs
    respbody = await unbaseDefs(respbody);
  }
  return respbody;
}

async function returnCombinedConfig(customObj, emptyObj, isSpecialArray) {
  let retObj;
  if (customObj == undefined) {
    //console.log("RCC CO Null: "+emptyObj);
    retObj = emptyObj;
  } else if (emptyObj == undefined) {
    //console.log("RCC EO Null: "+customObj);
    retObj = customObj;
  } else if (isSpecialArray) {
    let retTempObj = [];
    if (customObj.length > 0) {
      for (let counter = 0; counter < customObj.length; counter++) {
        retTempObj[counter] = await returnCombinedConfig(
          customObj[counter],
          emptyObj[counter],
          false
        );
      }
    }
    //console.log("RCC TypeSA: "+retTempObj);
    retObj = retTempObj;
  } else if (Array.isArray(customObj)) {
    //console.log("RCC TypeA: "+customObj);
    retObj = customObj;
  } else if (typeof customObj == typeof {}) {
    let retTempObj = {};
    for (let objKey in emptyObj) {
      let specialArr = false;
      if (objKey == "surveydefs" || objKey == "desktop" || objKey == "mobile") {
        specialArr = true;
      }
      let tempObj = await returnCombinedConfig(
        emptyObj[objKey],
        customObj[objKey],
        specialArr
      );
      if (tempObj != undefined /*&& !isEqual(tempObj,{})*/) {
        retTempObj[objKey] = tempObj;
      }
    }
    for (let objKey in customObj) {
      let specialArr = false;
      if (objKey == "surveydefs" || objKey == "desktop" || objKey == "mobile") {
        specialArr = true;
      }
      let tempObj = await returnCombinedConfig(
        customObj[objKey],
        emptyObj[objKey],
        specialArr
      );
      if (tempObj != undefined /*&& !isEqual(tempObj,{})*/) {
        retTempObj[objKey] = tempObj;
      }
    }
    //console.log("RCC TypeO: "+retTempObj);
    retObj = retTempObj;
  } else {
    //console.log("RCC Else: "+customObj);
    retObj = customObj;
  }
  return retObj;
}

async function skCopy(sitekey) {
  filesystem.deleteFileOrDirIfExists(
    process.cwd() + "/tools/clientconfigs/" + sitekey
  );
  other.doAGit([
    "clone",
    "https://github.com/foreseecode/websdk-client-configs.git",
    "tools/clientconfigs/" + sitekey
  ]);
  //if that failed, filesystem.deleteFileOrDirIfExists(process.cwd() + "tools/clientconfigs/" + sitekey);
  try {
    let done = other.doAGit([
      `--git-dir=tools/clientconfigs/${sitekey}/.git`,
      "pull",
      "origin",
      `${sitekey}`
    ]);
    if (done == 1) {
      other.doAGit([
        `--git-dir=tools/clientconfigs/${sitekey}/.git`,
        "checkout",
        "-b",
        `${sitekey}`
      ]);
      other.doAGit([
        `--git-dir=tools/clientconfigs/${sitekey}/.git`,
        "push",
        "-u",
        `https://github.com/foreseecode/websdk-client-configs.git/`,
        `${sitekey}`
      ]);
      console.log("Created new branch " + sitekey);
    } else {
      other.doAGit([
        `--git-dir=tools/clientconfigs/${sitekey}/.git`,
        "checkout",
        "--track",
        `origin/${sitekey}`
      ]);
      console.log("Checked out existing branch " + sitekey);
    }
  } catch (err) {
    console.log(err);
  }
  console.log("Checked out websdk-client-configs branch for sitekey", sitekey);
}

async function getCustom(path, sitekey, env) {
  //make the call to the url to retrieve the empty config
  let resp = other.httpRequest(
    "GET",
    `https://fsrsupport.foresee.com/api/JSON/custom?sitekey=${sitekey}&container=${env}`
  );
  let respbody = resp.getBody("utf8");
  respbody = JSON.parse(respbody);
  filesystem.writeToFile(
    path + sitekey + `/config_` + env + `.json`,
    JSON.stringify(respbody)
  );
  //make the call to the url to retrieve the whole folder, then unzip and copy logos into local folder to keep
  if (fs.existsSync(path + sitekey + `/configassets_` + env + `.zip`)) {
    console.log("Deleting " + path + sitekey + `/configassets_` + env + `.zip`);
    rimraf(path + sitekey + `/configassets_` + env + `.zip`, function(err) {
      if (err) {
        return reject(err);
      }
      //console.log("Deleted "+path+sitekey+`/configassets_`+env+`.zip`);
    });
  }
  resp = other.httpRequest(
    "GET",
    `https://fcp.foresee.com/sites/${sitekey}/containers/${env}/files`,
    { headers: { authorization: fcp.fcpROCreds } }
  );
  respbody = resp.getBody(null);
  filesystem.writeToFile(
    path + sitekey + `/configassets_` + env + `.zip`,
    respbody
  );
  fs.mkdirSync(path + sitekey + `/configassets_` + env);
  //fs.createReadStream(path+sitekey+`/configassets_`+env+`.zip`).pipe(unzip.Extract({ path: `${path}${sitekey}/configassets_${env}`})); //to extract the whole zip folder
  fs.createReadStream(path + sitekey + `/configassets_` + env + `.zip`)
    .pipe(unzip.Parse())
    .on("entry", function(entry) {
      if (
        entry.path !== "trigger/" &&
        entry.path.substr(0, 8) === "trigger/" &&
        entry.path.substr(0, 18) !== "trigger/templates/"
      ) {
        if (entry.type == "Directory") {
          fs.mkdirSync(
            path + sitekey + `/configassets_` + env + `/` + entry.path
          );
        } else {
          entry.pipe(
            fs.createWriteStream(
              path +
                sitekey +
                `/configassets_` +
                env +
                `/` +
                entry.path.substr(8)
            )
          );
        }
      } else {
        entry.autodrain();
      }
    });
  if (fs.existsSync(path + sitekey + `/configassets_` + env + `.zip`)) {
    console.log("Deleting " + path + sitekey + `/configassets_` + env + `.zip`);
    rimraf(path + sitekey + `/configassets_` + env + `.zip`, function(err) {
      if (err) {
        return reject(err);
      }
      console.log(
        "Deleted " + path + sitekey + `/configassets_` + env + `.zip`
      );
    });
  }
  return other.spawnProcess("npx", [`prettier --write config_${env}.json`], {
    cwd: path + sitekey + "/CC/",
    stdio: "inherit",
    shell: true
  });
  //await other.spawnProcess('npx', [`prettier --write config.json`],{cwd:path+sitekey+'/FCP/'+env,stdio:'inherit',shell:true});
}

async function ccCopy(path) {
  jconfig = await readFile(path + "/config.json");
  return new Promise(function(resolve, reject) {
    filesystem.deleteFileOrDirIfExists(path + "/CC");
    process.nextTick(async function() {
      let codeVersion = await returnCodeVersion(jconfig);
      if (codeVersion == null) {
        err = "Code Version not defined in config.json > global > codeVer";
        return reject(err);
      }
      filesystem.makeDirIfMissing(`./tools/CCT`);
      if (
        filesystem.copyFrom2ToIfFromExists(
          `./tools/CCT/${codeVersion}`,
          path + "/CC",
          `Have client code folder for ${codeVersion} stashed, coping it over...`
        )
      ) {
        return resolve();
      }
      let repoUrl = "https://github.com/foreseecode/client_code.git";
      // should come back and fix this to use semVer https://www.npmjs.com/package/semver
      if (cctVersions.includes(codeVersion)) {
        repoUrl = "https://github.com/foreseecode/client_code_template.git";
      }
      console.log(
        "Copying Code Version",
        codeVersion,
        "from Repo Url",
        repoUrl
      );
      // Now go get the client code
      gitsync(
        {
          dest: path,
          repo: repoUrl,
          branch: codeVersion
        },
        function(err) {
          if (err) {
            console.log("Error getting client code from Github!", err);
            return reject(err);
          }
          return resolve();
        }
      );
    });
  });
}

async function ccStash(path) {
  jconfig = await readFile(path + "/config.json");
  let codeVersion = await returnCodeVersion(jconfig);
  filesystem.copyFrom2ToIfToMissing(
    path + "/CC",
    `./tools/CCT/${codeVersion}`,
    `Going to stash client code folder for ${codeVersion} because you don't have it. This will save you time in the future, but may take a moment...`
  );
  return "done";
}

/**
 * Copies assets from top level folder
 */
async function assetsCopy(path) {
  filesystem.deleteFileOrDirIfExists(
    path + "/CC/clientconfig/productconfig/trigger/assets/*"
  );
  filesystem.copyFrom2ToIfFromExists(
    path + "/assets",
    path + "/CC/clientconfig/productconfig/trigger/assets/"
  );
  return;
}

async function configRebuild(path, sitekey) {
  jconfig = await readFile(path + "/config.json");
  let codeVersion = await returnCodeVersion(jconfig);
  let econfig = await returnEmptyConfig(codeVersion);

  //console.log("EmptyConfig:",econfig);
  let combinedconfig = await returnCombinedConfig(jconfig, econfig, false);
  //console.log("Combined config:",combinedconfig.trigger.surveydefs);
  // then the logic to rebuild from that into the actual files
  let cptemplate = filesystem.readFileToStringIfExists(
    `./tools/EJS/${codeVersion}/client_properties.ejs`,
    "utf-8"
  );
  let rpctemplate = filesystem.readFileToStringIfExists(
    `./tools/EJS/${codeVersion}/record_productconfig.ejs`,
    "utf-8"
  );
  let tpctemplate = filesystem.readFileToStringIfExists(
    `./tools/EJS/${codeVersion}/trigger_productconfig.ejs`,
    "utf-8"
  );
  let sdtemplate = filesystem.readFileToStringIfExists(
    `./tools/EJS/${codeVersion}/surveydef.ejs`,
    "utf-8"
  );

  let filecontents = ejs.render(
    cptemplate,
    { combinedconfig: combinedconfig },
    { delimiter: "%" }
  );
  //console.log(filecontents);
  filesystem.writeToFile(
    path + "/CC/clientconfig/client_properties.js",
    filecontents
  );

  filecontents = ejs.render(
    rpctemplate,
    { combinedconfig: combinedconfig },
    { delimiter: "%" }
  );
  //console.log(filecontents);
  filesystem.writeToFile(
    path + "/CC/clientconfig/productconfig/record/product_config.js",
    filecontents
  );

  filecontents = ejs.render(
    tpctemplate,
    { combinedconfig: combinedconfig },
    { delimiter: "%" }
  );
  //console.log(filecontents);
  filesystem.writeToFile(
    path + "/CC/clientconfig/productconfig/trigger/product_config.js",
    filecontents
  );

  for (var def in combinedconfig.trigger.surveydefs) {
    filecontents = ejs.render(
      sdtemplate,
      { surveydef: combinedconfig.trigger.surveydefs[def] },
      { delimiter: "%" }
    );
    //console.log(filecontents);
    let tempstring = "0";
    if (def < 10) {
      tempstring = "00";
    }
    filesystem.writeToFile(
      path +
        `/CC/clientconfig/productconfig/trigger/surveydef/def${tempstring}${def}.js`,
      filecontents
    );
  }
  filesystem.deleteFileOrDirIfExists(
    path + "/CC/clientconfig/productconfig/trigger/surveydef/def0.js",
    "Deleting def0 from the surveydef folder"
  );
  filesystem.deleteFileOrDirIfExists(
    path + "/CC/clientconfig/productconfig/trigger/surveydef/def1.js",
    "Deleting def1 from the surveydef folder"
  );
  filesystem.copyFrom2ToIfFromExists(
    path + "/CC/clientconfig/globalconfig/prod.js",
    path + `/CC/clientconfig/globalconfig/local.js`
  );
  /* leaving this to revisit and make sure I didn't mess up the logic by putting in the line above instead
  if (fs.existsSync(path + '/CC/clientconfig/globalconfig/local.js')) {
    let prodfile = fs.readFileSync(path + '/CC/clientconfig/globalconfig/prod.js', "utf-8");
    filesystem.writeToFile(path + `/CC/clientconfig/globalconfig/local.js`, prodfile);
  }*/
  filesystem.copyFrom2ToIfFromExists(
    `./tools/FCP/${codeVersion}/gulpfile.js`,
    path + `/CC/gulpfile.js`
  );
  filesystem.copyFrom2ToIfFromExists(
    `./tools/FCP/${codeVersion}/FCP.js`,
    path + `/CC/scripts/FCP.js`
  );
  return "done";
}

async function npmRebuild(path) {
  jconfig = await readFile(path + "/config.json");
  let codeVersion = await returnCodeVersion(jconfig);
  filesystem.copyFrom2ToIfFromExists(
    `./tools/NPM/${codeVersion}`,
    path + "/CC/node_modules",
    `Have node modules folder for ${codeVersion} stashed, coping it over...`
  );
  return "done";
}

async function npmStash(path) {
  jconfig = await readFile(path + "/config.json");
  let codeVersion = await returnCodeVersion(jconfig);
  filesystem.copyFrom2ToIfToMissing(
    path + "/CC/node_modules",
    `./tools/NPM/${codeVersion}`,
    `Going to stash node modules folder for ${codeVersion} because you don't have it. This will save you time in the future, but may take a moment...`
  );
  return "done";
}

async function deleteBranch(path) {
  return filesystem.deleteFileOrDirIfExists(path);
}

async function readFile(filename) {
  /* Read File */
  return new Promise(function(resolve, reject) {
    fs.readFile(filename, function read(err, data) {
      /* If an error exists, show it, otherwise show the file */
      if (err) {
        return reject(err);
      }
      data = JSON.parse(data);
      return resolve(data);
    });
  });
}

async function pushCxSuiteConfigsToDevContainer(path) {
  await spotcheck.checkCustomerKey(path + "/config.json");
  await spotcheck.checkCodeVersion(path + "/config.json");
  await spotcheck.checkSiteKey(path + "/config.json");
  await spotcheck.checkCustomerId(path + "/config.json");
  let jconfig = await readFile(path + "/config.json");
  return new Promise(function(resolve, reject) {
    if (!jconfig) {
      return reject(`Your path ${path} isn't valid...`);
    }
    let cxsConfig = fcp.cxsDefaultConfig;
    cxsConfig.clientId = jconfig.global.customerKey;
    cxsConfig.siteKey = jconfig.global.siteKey;
    cxsConfig.codeVer = jconfig.global.codeVer;
    cxsConfig.customerId = jconfig.global.customerId;
    //would be easy to add a line here to push other containers... cxsConfig.containerId = whatever , you'd just have to pass in whatever as a value
    cxsConfig = JSON.stringify(cxsConfig);
    filesystem.makeDirIfMissing(`./tools/clientconfigs`);
    filesystem.makeDirIfMissing(`./tools/clientconfigs/_globalconfigs`);
    filesystem.writeToFile(
      `./tools/clientconfigs/_globalconfigs` + `/${jconfig.global.siteKey}.js`,
      cxsConfig
    );
    let formdata = {
      notes: `Pushing cxSuite global config values to container develop of sitekey ${
        jconfig.global.siteKey
      } for testing`,
      config: fs.createReadStream(
        `./tools/clientconfigs/_globalconfigs` + `/${jconfig.global.siteKey}.js`
      )
    };
    let unpw = other.getUnPw(
      "What is your username for fcp(aws)?",
      "What is your password for fcp(aws)?"
    );
    unpw.replace(":", "@aws.foreseeresults.com:");
    multipartPost(
      `https://${unpw}@fcp.foresee.com/sites/${
        jconfig.global.siteKey
      }/containers/development/configs`,
      formdata
    );
    filesystem.deleteFileOrDirIfExists(
      `./tools/clientconfigs/_globalconfigs` + `/${jconfig.global.siteKey}.js`
    );
    /*request.post(
      {
        url: `https://${un}:${pw}@fcp.foresee.com/sites/${
          jconfig.global.siteKey
        }/containers/development/configs`,
        formData: formdata
      },
      function optionalCallback(err, httpResponse, body) {
        if (err) {
          return console.error("upload failed:", err);
        }
        console.log("Contact successful... Server responded with:", body);
        filesystem.deleteFileOrDirIfExists(
          `./tools/clientconfigs/_globalconfigs` +
            `/${jconfig.global.siteKey}.js`
        );
      }
    );*/
    return resolve(true);
  });
}

async function prettifyCC(path) {
  await other.spawnProcess(
    "npx",
    [`prettier --write CC/clientconfig/client_properties.js`],
    { cwd: path + "/CC/", stdio: "inherit", shell: true }
  );
  await other.spawnProcess(
    "npx",
    [`prettier --write CC/clientconfig/productconfig/record/product_config.js`],
    { cwd: path + "/CC/", stdio: "inherit", shell: true }
  );
  await other.spawnProcess(
    "npx",
    [
      `prettier --write CC/clientconfig/productconfig/trigger/product_config.js`
    ],
    { cwd: path + "/CC/", stdio: "inherit", shell: true }
  );
  await other.spawnProcess(
    "npx",
    [`prettier --write CC/clientconfig/productconfig/trigger/surveydef/*`],
    { cwd: path + "/CC/", stdio: "inherit", shell: true }
  );
}

module.exports = {
  returnCodeVersion,
  updateCodeVersion,
  updateToModernInvite,
  fullDefection,
  skCopy,
  getCustom,
  readFile,
  ccCopy,
  ccStash,
  npmRebuild,
  npmStash,
  configRebuild,
  assetsCopy,
  prettifyCC,
  pushCxSuiteConfigsToDevContainer,
  deleteBranch
};
