var gulp = require('gulp'),
  spawn = require('child_process').spawn,
  request = require('request'),
  syncrequest = require('sync-request'),
  isEqual = require('lodash.isequal'),
  atob = require('atob'),
  fs = require('fs'),
  rimraf = require('rimraf'),
  copydir = require('copy-dir'),
  gitsync = require('./node-gitsync.js'),
  jconfig;
ejs = require('ejs');
const git = require("simple-git/promise")();

async function updateCodeVersion(path, codeVersion) {
  jconfig = await readFile(path + '\\config.json');
  return new Promise(function (resolve, reject) {
    if (jconfig && jconfig.global && jconfig.global.codeVer) {
      jconfig.global.codeVer = codeVersion;
      jconfig = JSON.stringify(jconfig);
      fs.writeFileSync(path + '\\config.json', jconfig, function (err) {
        if (err) {
          return reject(err);
        }
        console.log("Updated code version in config.json to " + codeVersion);
      });
    }
    return resolve();
  });
}

async function returnCodeVersion(config) {
  return new Promise(function (resolve, reject) {
    let codeVersion = null;
    if (config && config.global && config.global.codeVer)
      codeVersion = config.global.codeVer;
    return resolve(codeVersion);
  });
}

async function addEmptyDefs(customObj, emptyObj) {
  let emptyDef = emptyObj.trigger.surveydefs[0];
  emptyObj.trigger.surveydefs = [];
  for (var def in customObj.trigger.surveydefs) {
    //console.log(def)
    emptyObj.trigger.surveydefs.push(emptyDef);
  }
  //console.log(emptyObj.trigger.surveydefs)
  return emptyObj;
}

async function unbaseDefs(Obj) {
  let retObj = Obj;
  for (var def in retObj.trigger.surveydefs) {
    var tempDef = {};
    eval('tempDef=' + atob(retObj.trigger.surveydefs[def]));
    //console.log(typeof tempDef, tempDef)
    retObj.trigger.surveydefs[def] = tempDef;
  }
  //console.log(retObj.trigger.surveydefs)
  return retObj;
}

async function returnEmptyConfig(codeVersion) {
  let codeVersionWithDashes = codeVersion.replace(/\./g, '-');
  let emptyConfigUrl = `https://gateway-elb.foresee.com/sites/emptyconfigs/${codeVersionWithDashes}/config.json`;
  //make the call to the url to retrieve the empty config
  let resp = syncrequest('GET', emptyConfigUrl);
  let respbody = resp.getBody('utf8');
  respbody = JSON.parse(respbody);
  respbody = await addEmptyDefs(jconfig, respbody);
  // should come back and fix this to use semVer https://www.npmjs.com/package/semver
  if (
    codeVersion == '19.3.0'
    || codeVersion == '19.3.1'
    || codeVersion == '19.3.2'
    || codeVersion == '19.3.2-v.2'
    || codeVersion == '19.3.2-v.3'
    || codeVersion == '19.3.3'
    || codeVersion == '19.3.3-v.2'
    || codeVersion == '19.3.3-v.3'
    || codeVersion == '19.3.4'
    || codeVersion == '19.3.5'
    || codeVersion == '19.3.6'
    || codeVersion == '19.3.7'
    || codeVersion == '19.3.7-hf.1'
    || codeVersion == '19.4.0'
    || codeVersion == '19.4.1'
    || codeVersion == '19.4.2'
    || codeVersion == '19.4.3'
    || codeVersion == '19.4.4'
    || codeVersion == '19.5.0'
    || codeVersion == '19.5.1'
    || codeVersion == '19.5.2'
    || codeVersion == '19.6.0'
    || codeVersion == '19.6.1'
    || codeVersion == '19.6.2'
    || codeVersion == '19.6.3'
    || codeVersion == '19.6.4'
    || codeVersion == '19.6.5'
    || codeVersion == '19.6.6'
    || codeVersion == '19.6.7'
    || codeVersion == '19.6.8'
    || codeVersion == '19.7.0'
    || codeVersion == '19.7.1'
    || codeVersion == '19.7.2'
    || codeVersion == '19.7.3'
    || codeVersion == '19.7.4'
    || codeVersion == '19.7.5'
    || codeVersion == '19.7.6'
    || codeVersion == '19.8.0'
    || codeVersion == '19.8.1'
    || codeVersion == '19.8.2'
    || codeVersion == '19.8.3'
    || codeVersion == '19.8.4'
    || codeVersion == '19.8.5'
    || codeVersion == '19.8.6'
    || codeVersion == '19.8.7'
  ) {
    // unbase64 the surveydefs
    respbody = await unbaseDefs(respbody);
  }
  return respbody;
}

async function returnCombinedConfig(customObj,emptyObj,isSpecialArray) {
  let retObj;
  if (customObj == undefined) {
    //console.log("RCC CO Null: "+emptyObj);
    retObj = emptyObj;
  }
  else if (emptyObj == undefined) {
    //console.log("RCC EO Null: "+customObj);
    retObj = customObj;
  }
  else if (isSpecialArray) {
    let retTempObj=[];
    if(customObj.length>0) {
      for(let counter=0;counter<customObj.length;counter++) {
        retTempObj[counter]= await returnCombinedConfig(customObj[counter],emptyObj[counter],false);
      }
    }
    //console.log("RCC TypeSA: "+retTempObj);
    retObj = retTempObj;
  }
  else if(Array.isArray(customObj)) {
    //console.log("RCC TypeA: "+customObj);
    retObj = customObj;
  }
  else if (typeof customObj == typeof {}) {
    let retTempObj={};
    for(let objKey in emptyObj) {
      let specialArr = false;
      if(objKey == 'surveydefs' || objKey == 'desktop' || objKey == 'mobile') { specialArr = true; }
      let tempObj= await returnCombinedConfig(emptyObj[objKey],customObj[objKey],specialArr);
      if(tempObj != undefined /*&& !isEqual(tempObj,{})*/) {
        retTempObj[objKey]=tempObj;
      }
    }
    for(let objKey in customObj) {
      let specialArr = false;
      if(objKey == 'surveydefs' || objKey == 'desktop' || objKey == 'mobile') { specialArr = true; }
      let tempObj= await returnCombinedConfig(customObj[objKey],emptyObj[objKey],specialArr);
      if(tempObj != undefined /*&& !isEqual(tempObj,{})*/) {
        retTempObj[objKey]=tempObj;
      }
    }
    //console.log("RCC TypeO: "+retTempObj);
    retObj = retTempObj;
  }
  else {
    //console.log("RCC Else: "+customObj);
    retObj = customObj;
  }
  return retObj;
}

async function skClear(path) {
  return new Promise(function (resolve, reject) {
    if (fs.existsSync(path)) {
      console.log("Deleting the folder at " + path);
      rimraf(path, function (err) {
        if (err) { return reject(err); }
        console.log("Deleted the folder at " + path);
        return resolve();
      });
    } else {
      console.log("No folder existed at " + path);
      return resolve();
    }
  });
}

async function skCopy(sitekey) {
  await git.raw(["clone", "https://github.com/foreseecode/websdk-client-configs.git", 'tools/clientconfigs/' + sitekey], function (err, result) {
    if (err) {
      rimraf('tools/clientconfigs/' + sitekey, function () {
        cb(err);
      });
    } else {
      cb();
    }
  });
  try {
    let done = await gitPull(sitekey);
    if (done == 1) {
      await gitCreate(sitekey);
      await gitPublish(sitekey);
      console.log('Created new branch ' + sitekey);
    }
    else {
      await gitCheckout(sitekey);
      console.log('Checked out existing branch ' + sitekey);
    }
  } catch(err) {
    console.log(err);
  }
  console.log("Checked out websdk-client-configs branch for sitekey", sitekey);
}

async function getCustom(path, sitekey, env) {
  let customConfigUrl = `https://fsrsupport.foresee.com/api/JSON/custom?sitekey=${sitekey}&container=${env}`;
  //make the call to the url to retrieve the empty config
  let resp = syncrequest('GET', customConfigUrl);
  let respbody = resp.getBody('utf8');
  respbody = JSON.parse(respbody);
  fs.writeFileSync(path+sitekey+`/config_`+env+`.json`, JSON.stringify(respbody), function (err) {
    if (err) throw err;
  });
  return customPrettify(path+'/'+sitekey, `config_${env}.json`);
}

async function ccClear(path) {
  return new Promise(function (resolve, reject) {
    if (fs.existsSync(path + '/CC')) {
      console.log("Deleting the CC folder", path);
      rimraf(path + '/CC', function (err) {
        if (err) { return reject(err); }
        console.log("Deleted CC folder");
        return resolve();
      });
    } else {
      console.log("No folder existed at " + path + '\\CC');
      return resolve();
    }
  });
}

async function ccCopy(path) {
  jconfig = await readFile(path + '\\config.json');
  return new Promise(function (resolve, reject) {
    process.nextTick(async function () {
      let codeVersion = await returnCodeVersion(jconfig);
      let repoUrl = 'https://github.com/foreseecode/client_code.git';
      // should come back and fix this to use semVer https://www.npmjs.com/package/semver
      if (
        codeVersion == '19.3.0'
        || codeVersion == '19.3.1'
        || codeVersion == '19.3.2'
        || codeVersion == '19.3.2-v.2'
        || codeVersion == '19.3.2-v.3'
        || codeVersion == '19.3.3'
        || codeVersion == '19.3.3-v.2'
        || codeVersion == '19.3.3-v.3'
        || codeVersion == '19.3.4'
        || codeVersion == '19.3.5'
        || codeVersion == '19.3.6'
        || codeVersion == '19.3.7'
        || codeVersion == '19.3.7-hf.1'
        || codeVersion == '19.4.0'
        || codeVersion == '19.4.1'
        || codeVersion == '19.4.2'
        || codeVersion == '19.4.3'
        || codeVersion == '19.4.4'
        || codeVersion == '19.5.0'
        || codeVersion == '19.5.1'
        || codeVersion == '19.5.2'
        || codeVersion == '19.6.0'
        || codeVersion == '19.6.1'
        || codeVersion == '19.6.2'
        || codeVersion == '19.6.3'
        || codeVersion == '19.6.4'
        || codeVersion == '19.6.5'
        || codeVersion == '19.6.6'
        || codeVersion == '19.6.7'
        || codeVersion == '19.6.8'
        || codeVersion == '19.7.0'
        || codeVersion == '19.7.1'
        || codeVersion == '19.7.2'
        || codeVersion == '19.7.3'
        || codeVersion == '19.7.4'
        || codeVersion == '19.7.5'
        || codeVersion == '19.7.6'
        || codeVersion == '19.8.0'
        || codeVersion == '19.8.1'
        || codeVersion == '19.8.2'
        || codeVersion == '19.8.3'
        || codeVersion == '19.8.4'
        || codeVersion == '19.8.5'
        || codeVersion == '19.8.6'
        || codeVersion == '19.8.7'
      ) repoUrl = 'https://github.com/foreseecode/client_code_template.git';
      console.log('Copying Code Version', codeVersion, 'from Repo Url', repoUrl);
      if (codeVersion == null) {
        err = "Code Version not defined in config.json > global > codeVer";
        return reject(err);
      }
      // Now go get the client code
      gitsync({
        'dest': path,
        'repo': repoUrl,
        'branch': codeVersion
      }, function (err) {
        if (err) {
          console.log("Error getting client code!", err);
          return reject(err);
        }
        return resolve();
      });
    });
  });
};

/**
 * Delete assets folder if it exists
 */
async function assetsClear(path) {
  if (fs.existsSync(path + '/CC/clientconfig/productconfig/trigger/assets')) {
    console.log("Clearing the trigger assets folder");
    rimraf.sync(path + '/CC/clientconfig/productconfig/trigger/assets/*');
    return;
  } else console.log("No folder existed at " + path + "\\CC\\clientconfig\\productconfig\\trigger\\assets");
}

/**
 * Copies assets from top level folder
 */
async function assetsCopy(path) {
  copydir.sync(path + '/assets', path + '/CC/clientconfig/productconfig/trigger/assets/', {
    utimes: false,
    mode: false,
    cover: false,
  });
  return;
}

async function legacyCheck(jconfig, econfig, path, sitekey) {
  let stgConfigUrl = `http://gateway-elb.foresee.com/sites/${sitekey}/staging/config.json`;
  let resp = syncrequest('GET', stgConfigUrl);
  let respbody = resp.getBody('utf8');
  respbody = JSON.parse(respbody);
  let codeVersion = await returnCodeVersion(respbody);
  return new Promise(function (resolve, reject) {
    if (
      codeVersion == '19.3.0'
      || codeVersion == '19.3.1'
      || codeVersion == '19.3.2'
      || codeVersion == '19.3.2-v.2'
      || codeVersion == '19.3.2-v.3'
      || codeVersion == '19.3.3'
      || codeVersion == '19.3.3-v.2'
      || codeVersion == '19.3.3-v.3'
      || codeVersion == '19.3.4'
      || codeVersion == '19.3.5'
      || codeVersion == '19.3.6'
      || codeVersion == '19.3.7'
      || codeVersion == '19.3.7-hf.1'
      || codeVersion == '19.4.0'
      || codeVersion == '19.4.1'
      || codeVersion == '19.4.2'
      || codeVersion == '19.4.3'
      || codeVersion == '19.4.4'
      || codeVersion == '19.5.0'
      || codeVersion == '19.5.1'
      || codeVersion == '19.5.2'
      || codeVersion == '19.6.0'
      || codeVersion == '19.6.1'
      || codeVersion == '19.6.2'
      || codeVersion == '19.6.3'
      || codeVersion == '19.6.4'
      || codeVersion == '19.6.5'
      || codeVersion == '19.6.6'
      || codeVersion == '19.6.7'
      || codeVersion == '19.6.8'
    ) {
      if (jconfig && jconfig.trigger && jconfig.trigger.surveydefs) {
        for (var def of jconfig.trigger.surveydefs) {
          if (def.display && def.display.desktop && def.display.desktop[0]) {
            def.display.desktop[0].displayname = "default";
            def.display.desktop[0].template = "classicdesktop";
            if (def.display.desktop[0].vendorTitleText == null) {
              def.display.desktop[0].vendorTitleText = "ForeSee";
            }
            if (def.display.desktop[0].vendorAltText == null) {
              def.display.desktop[0].vendorAltText = "ForeSee";
            }
            if (def.display.desktop[0].hideForeSeeLogoDesktop == null) {
              def.display.desktop[0].hideForeSeeLogoDesktop = "false";
            }
            if (def.display.desktop[0].dialog){
              let newDialog = {};
              for (obj in econfig.trigger.surveydefs[0].display.desktop[0].dialog) {
                if (!def.display.desktop[0].dialog[obj]) {
                  newDialog[obj] = econfig.trigger.surveydefs[0].display.desktop[0].dialog[obj];
                }
              }
              for (obj in def.display.desktop[0].dialog) {
                if (!newDialog[obj]) {
                  newDialog[obj] = def.display.desktop[0].dialog[obj];
                }
              }
              def.display.desktop[0].dialog=newDialog;
            }
          }
        }
        jconfigFile = JSON.stringify(jconfig);
        fs.writeFileSync(path + '\\config.json', jconfigFile, function (err) {
          if (err) {
            return reject(err);
          }
        });
        customPrettify(path, `config.json`);
      }
    }
    return resolve(jconfig);
  });
}

async function configRebuild(path, sitekey) {
  jconfig = await readFile(path + '\\config.json')
  let codeVersion = await returnCodeVersion(jconfig);
  let econfig = await returnEmptyConfig(codeVersion);
  
  jconfig = await legacyCheck(jconfig, econfig, path, sitekey);

  //console.log("EmptyConfig:",econfig);
  let combinedconfig = await returnCombinedConfig(jconfig, econfig, false);
  // then the logic to rebuild from that into the actual files

  let cptemplate = fs.readFileSync(`./tools/EJS/${codeVersion}/client_properties.ejs`, "utf-8");/*,function (err) {
      if (err) throw err;
    });*/
  let rpctemplate = fs.readFileSync(`./tools/EJS/${codeVersion}/record_productconfig.ejs`, "utf-8");/*,function (err) {
       if (err) throw err;
     });*/
  let tpctemplate = fs.readFileSync(`./tools/EJS/${codeVersion}/trigger_productconfig.ejs`, "utf-8");/*,function (err) {
       if (err) throw err;
    });*/
  let sdtemplate = fs.readFileSync(`./tools/EJS/${codeVersion}/surveydef.ejs`, "utf-8");/*,function (err) {
       if (err) throw err;
     });*/

  let filecontents = ejs.render(cptemplate, { combinedconfig: combinedconfig }, { delimiter: '%' });
  //console.log(filecontents);
  fs.writeFileSync(path + '/CC/clientconfig/client_properties.js', filecontents, function (err) {
    if (err) throw err;
  });

  filecontents = ejs.render(rpctemplate, { combinedconfig: combinedconfig }, { delimiter: '%' });
  //console.log(filecontents);
  fs.writeFileSync(path + '/CC/clientconfig/productconfig/record/product_config.js', filecontents, function (err) {
    if (err) throw err;
  });

  filecontents = ejs.render(tpctemplate, { combinedconfig: combinedconfig }, { delimiter: '%' });
  //console.log(filecontents);
  fs.writeFileSync(path + '/CC/clientconfig/productconfig/trigger/product_config.js', filecontents, function (err) {
    if (err) throw err;
  });

  for (var def in combinedconfig.trigger.surveydefs) {
    filecontents = ejs.render(sdtemplate, { surveydef: combinedconfig.trigger.surveydefs[def] }, { delimiter: '%' });
    //console.log(filecontents);
    let tempstring = '0';
    if (def < 10) { tempstring = '00'; };
    fs.writeFileSync(path + `/CC/clientconfig/productconfig/trigger/surveydef/def${tempstring}${def}.js`, filecontents, function (err) {
      if (err) throw err;
    });
  }

  if (fs.existsSync(path + '/CC/clientconfig/productconfig/trigger/surveydef/def0.js')) {
    console.log("Deleting def0 from the surveydef folder");
    rimraf(path + '/CC/clientconfig/productconfig/trigger/surveydef/def0.js', function (err) {
      if (err) console.log(err);
    });
  } else console.log("No def0 existed at " + path + '\\CC\\clientconfig\\productconfig\\trigger\\surveydef');

  if (fs.existsSync(path + '/CC/clientconfig/productconfig/trigger/surveydef/def1.js')) {
    console.log("Deleting def1 from the surveydef folder");
    rimraf(path + '/CC/clientconfig/productconfig/trigger/surveydef/def1.js', function (err) {
      if (err) console.log(err);
    });
  } else console.log("No def1 existed at " + path + '\\CC\\clientconfig\\productconfig\\trigger\\surveydef');
  if (fs.existsSync(path + '/CC/clientconfig/globalconfig/local.js')) {
    let prodfile = fs.readFileSync(path + '/CC/clientconfig/globalconfig/prod.js', "utf-8");
    fs.writeFileSync(path + `/CC/clientconfig/globalconfig/local.js`, prodfile, function (err) {
      if (err) throw err;
    });
  }
  return ("done");
}

async function deleteBranch(path) {
  if (fs.existsSync(path)) {
    console.log("Deleting branch for sitekey");
    rimraf.sync(path);
    return;
  } else console.log("No folder existed at " + path);
}

async function readFile(filename) {
  /* Read File */
  return new Promise(function (resolve, reject) {
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

function spawnProcess(command, args, options) {
  // *** Return the promise
  return new Promise(function (resolve, reject) {
    const process = spawn(command, args, options);
    process.on('exit', function (code) {
      return resolve(code);
    });
    process.on('error', function (err) {
      return reject(err);
    });
  });
}

async function gitPull(sitekey) {
  return spawnProcess('git', [`pull origin ${sitekey}`], { cwd: process.cwd() + '\\tools\\clientconfigs\\' + sitekey, stdio: 'inherit', shell: true });
}

async function gitCheckout(sitekey) {
  return spawnProcess('git', [`checkout --track origin/${sitekey}`], { cwd: process.cwd() + '\\tools\\clientconfigs\\' + sitekey, stdio: 'inherit', shell: true });
}

async function gitCreate(sitekey) {
  return spawnProcess('git', [`checkout -b ${sitekey}`], { cwd: process.cwd() + '\\tools\\clientconfigs\\' + sitekey, stdio: 'inherit', shell: true });
}

async function gitPublish(sitekey) {
  return spawnProcess('git', [`push -u origin ${sitekey}`], { cwd: process.cwd() + '\\tools\\clientconfigs\\' + sitekey, stdio: 'inherit', shell: true });
}

async function gitAdd(sitekey) {
  return spawnProcess('git', [`add .`], { cwd: process.cwd() + '\\tools\\clientconfigs\\' + sitekey, stdio: 'inherit', shell: true });
}

async function gitCommit(sitekey, message) {
  return spawnProcess('git', [`commit -m ${message}`], { cwd: process.cwd() + '\\tools\\clientconfigs\\' + sitekey, stdio: 'inherit', shell: true });
}

async function gitPush(sitekey) {
  return spawnProcess('git', [`push`], { cwd: process.cwd() + '\\tools\\clientconfigs\\' + sitekey, stdio: 'inherit', shell: true });
}

async function ccNpm(path) {
  return spawnProcess('npm', ['install'], { cwd: path + '/CC/', stdio: 'inherit', shell: true });
}

async function customPrettify(path, filename) {
  return spawnProcess('npx', [`prettier --write ${filename}`], {cwd: path, stdio: 'inherit', shell: true });
}

async function ccPrettify(path) {
  return spawnProcess('npx', ['prettier --write client_properties.js'], { cwd: path + '/CC/clientconfig/', stdio: 'inherit', shell: true });
}

async function rpcPrettify(path) {
  return spawnProcess('npx', ['prettier --write productconfig/record/product_config.js'], { cwd: path + '/CC/clientconfig/', stdio: 'inherit', shell: true });
}

async function tpcPrettify(path) {
  return spawnProcess('npx', ['prettier --write productconfig/trigger/product_config.js'], { cwd: path + '/CC/clientconfig/', stdio: 'inherit', shell: true });
}

async function sdPrettify(path) {
  return spawnProcess('npx', ['prettier --write productconfig/trigger/surveydef/*'], { cwd: path + '/CC/clientconfig/', stdio: 'inherit', shell: true });
}

async function test(path) {
  return spawnProcess('gulp', ['test_debug'], { cwd: path + '/CC/', stdio: 'inherit', shell: true });
}

async function pushStg(path) {
  return spawnProcess('gulp', ['push_stg'], { cwd: path + '/CC/', stdio: 'inherit', shell: true });
}

async function pushProd(path) {
  return spawnProcess('gulp', ['push_prod'], { cwd: path + '/CC/', stdio: 'inherit', shell: true });
}

async function prettify(path) {
  ccPrettify(path);
  rpcPrettify(path);
  tpcPrettify(path);
  sdPrettify(path);
}

module.exports = {
  returnCodeVersion,
  updateCodeVersion,
  skClear,
  skCopy,
  getCustom,
  readFile,
  ccClear,
  ccCopy,
  ccNpm,
  configRebuild,
  assetsClear,
  assetsCopy,
  prettify,
  customPrettify,
  test,
  pushStg,
  pushProd,
  gitAdd,
  gitCommit,
  gitPush,
  deleteBranch
};