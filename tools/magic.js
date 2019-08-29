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
  jconfig; //update - need to get this from websdk-client-configs
  ejs = require('ejs');

async function returnCodeVersion() {
  return new Promise(function(resolve, reject) {
    let codeVersion = null;
    if(jconfig && jconfig.global && jconfig.global.codeVer)
      codeVersion = jconfig.global.codeVer;
    resolve(codeVersion);
  });
}

async function addEmptyDefs(customObj,emptyObj) {
  let emptyDef = emptyObj.trigger.surveydefs[0];
  emptyObj.trigger.surveydefs=[];
  for(var def in customObj.trigger.surveydefs) {
    //console.log(def)
    emptyObj.trigger.surveydefs.push(emptyDef);
  }
  //console.log(emptyObj.trigger.surveydefs)
  return emptyObj;
}

async function unbaseDefs(Obj) {
  let retObj = Obj;
  for(var def in retObj.trigger.surveydefs) {
    var tempDef={};
    eval('tempDef='+atob(retObj.trigger.surveydefs[def]));
    //console.log(typeof tempDef, tempDef)
    retObj.trigger.surveydefs[def] = tempDef;
  }
  //console.log(retObj.trigger.surveydefs)
  return retObj;
}

async function returnEmptyConfig(codeVersion) {
  let codeVersionWithDashes = codeVersion.replace(/\./g,'-');
  let emptyConfigUrl = `https://gateway-elb.foresee.com/sites/emptyconfigs/${codeVersionWithDashes}/config.json`;
  //make the call to the url to retrieve the empty config
  let resp = syncrequest('GET',emptyConfigUrl);
  let respbody = resp.getBody('utf8');
  respbody = JSON.parse(respbody);
  respbody = await addEmptyDefs(jconfig,respbody);
  //  semver for comparing against 19.9.0
  if(codeVersion=='19.3.2-v.2'||codeVersion=='19.3.2-v.3'||codeVersion=='19.3.3-v.2'||codeVersion=='19.3.3-v.3'||codeVersion=='19.3.7-hf.1'||codeVersion<'19.9.0') {
    // unbase64 the surveydefs
    respbody = await unbaseDefs(respbody);
  }
  return respbody;
}


async function returnCombinedConfig(customObj,emptyObj,isSpecialArray) {
  let retObj;
  if (!isEqual(customObj,emptyObj) && customObj != undefined) {
    if(Array.isArray(customObj)/* && customObj[0].name != undefined*/) {
      var retTempObj=[];
      if(customObj.length > 0 && isSpecialArray) {// if it's a surveydef, then dig deeper. otherwise consider the whole array custom
        //console.log('Special Array: ',customObj)
        for(let counter=0;counter<customObj.length;counter++) {
          /* var tempObj=returnCombinedConfig(customObj[counter],emptyObj[counter],false);
          if(tempObj) {
            retTempObj[counter]=tempObj;
          } */
          retTempObj[counter]= await returnCombinedConfig(customObj[counter],emptyObj[counter],false);
        }
      }
      else {
        retTempObj=customObj;
      }
      retObj=retTempObj;
    }
    else if(typeof customObj == typeof {} && emptyObj != undefined) {
      var retTempObj=emptyObj;
      for(var objKey in customObj) {
        let specialArr = false;
        if(objKey == 'surveydefs' || objKey == 'desktop' || objKey == 'mobile')
          specialArr = true;
        var tempObj= await returnCombinedConfig(customObj[objKey],emptyObj[objKey],specialArr);
        if(tempObj != undefined /*&& !isEqual(tempObj,{})*/) {
            retTempObj[objKey]=tempObj;
        }
      }
      retObj=retTempObj;
    }
    else {
      retObj=customObj;
    }
  }
  else {
    retObj=emptyObj;
  }
  return retObj;
}

async function ccClear(path) {
  return new Promise(function(resolve, reject) {
    if(fs.existsSync(path+'/CC')) {
      console.log("Deleting the CC folder");
      console.log(path);
      rimraf(path+'/CC', function(err) {
        if (err) console.log(err);
        console.log("Deleted CC folder");
        resolve("done");
      });
    } else {
      console.log("No folder existed at "+path+'\\CC');
      resolve("done");
    }
  });
}

async function ccCopy(config,path) {
  jconfig = await readFile(config);
  return new Promise(function(resolve, reject) {
    process.nextTick(async function () {
      let codeVersion = await returnCodeVersion();
      let repoUrl = 'https://github.com/foreseecode/client_code.git';
      if(codeVersion=='19.3.2-v.2'||codeVersion=='19.3.2-v.3'||codeVersion=='19.3.3-v.2'||codeVersion=='19.3.3-v.3'||codeVersion=='19.3.7-hf.1'||codeVersion<'19.9.0')
        repoUrl = 'https://github.com/foreseecode/client_code_template.git';
      console.log('Copying Code Version',codeVersion,'from Repo Url',repoUrl);
      if(codeVersion==null)
        err="Code Version not defined in config.json > global > codeVer";
      // Now go get the client code
      gitsync({
        'dest': path,
        'repo': repoUrl,
        'branch': codeVersion
      }, function (err) {
        if (err) {
          console.log("Error getting client code!", err);
          return;
        }
        resolve("done");
      });
    });
  });
};

async function ccRename(config, path) {
  jconfig = await readFile(config);
  let codeVersion = await returnCodeVersion();
  return new Promise(function(resolve, reject){
    if(codeVersion==null)
      err="Code Version not defined in config.json > global > codeVer";
    fs.rename(path+'/'+codeVersion, path+'/CC', function (err) {
      if (err) {
        throw err;
      }
      resolve("done");
    });
  });
};


/**
 * Delete assets folder if it exists
 */
async function assetsClear(path) {
  if(fs.existsSync(path+'/CC/clientconfig/productconfig/trigger/assets')) {
    console.log("Clearing the trigger assets folder");
    rimraf.sync(path+'/CC/clientconfig/productconfig/trigger/assets/*');
    return ("done");
  } else console.log("No folder existed at "+path+"\\CC\\clientconfig\\productconfig\\trigger\\assets");
}

/**
 * Copies assets from top level folder
 */
async function assetsCopy(path) {
  copydir.sync(path+'/assets', path+'/CC/clientconfig/productconfig/trigger/assets/', {
    utimes: false,
    mode: false,
    cover: false,
  });
  return ("done");
}


async function configRebuild(config, path) {
  jconfig = await readFile(config);
  let codeVersion = await returnCodeVersion();
  let econfig = await returnEmptyConfig(codeVersion);
  let codeVersionWithDashes = codeVersion.replace(/\./g,'-');
  
  //console.log("EmptyConfig:",econfig);
  let combinedconfig = await returnCombinedConfig(jconfig,econfig,false);
  // then the logic to rebuild from that into the actual files

  let cptemplate = fs.readFileSync(__dirname+`/EJS/${codeVersion}/client_properties.ejs`,"utf-8");/*,function (err) {
	  if (err) throw err;
  });*/
  let rpctemplate = fs.readFileSync(__dirname+`/EJS/${codeVersion}/record_productconfig.ejs`,"utf-8");/*,function (err) {
	   if (err) throw err;
   });*/
  let tpctemplate = fs.readFileSync(__dirname+`/EJS/${codeVersion}/trigger_productconfig.ejs`,"utf-8");/*,function (err) {
	   if (err) throw err;
  });*/
  let sdtemplate = fs.readFileSync(__dirname+`/EJS/${codeVersion}/surveydef.ejs`,"utf-8");/*,function (err) {
	   if (err) throw err;
   });*/
  
  let filecontents = ejs.render(cptemplate, {combinedconfig: combinedconfig}, {delimiter: '%'});
  console.log(filecontents);
	fs.writeFileSync(path+'/CC/clientconfig/client_properties.js',filecontents,function (err) {
	  if (err) throw err;
  });
  
  filecontents = ejs.render(rpctemplate, {combinedconfig: combinedconfig}, {delimiter: '%'});
  console.log(filecontents);
	fs.writeFileSync(path+'/CC/clientconfig/productconfig/record/product_config.js',filecontents,function (err) {
	   if (err) throw err;
  });  
  
  filecontents = ejs.render(tpctemplate, {combinedconfig: combinedconfig}, {delimiter: '%'});
  console.log(filecontents);
  fs.writeFileSync(path+'/CC/clientconfig/productconfig/trigger/product_config.js',filecontents,function (err) {
	  if (err) throw err;
  });
  
  for(var def in combinedconfig.trigger.surveydefs){
    filecontents = ejs.render(sdtemplate, {surveydef: combinedconfig.trigger.surveydefs[def]}, {delimiter: '%'});
    console.log(filecontents);
    let tempstring = '0';
    if (def<10){tempstring='00';};
    fs.writeFileSync(path+`/CC/clientconfig/productconfig/trigger/surveydef/def${tempstring}${def}.js`,filecontents,function (err) {
      if (err) throw err;
    });
  }

  if(fs.existsSync('./CC/clientconfig/productconfig/trigger/surveydef/def0.js')) {
	  console.log("Deleting def0 from the surveydef folder");
	  rimraf('./CC/clientconfig/productconfig/trigger/surveydef/def0.js',function(err) {
      if (err) console.log(err);
    });
  } else console.log("No def0 existed at "+path+'\\CC\\clientconfig\\productconfig\\trigger\\surveydef');

  if(fs.existsSync('./CC/clientconfig/productconfig/trigger/surveydef/def1.js')) {
	  console.log("Deleting def1 from the surveydef folder");
	  rimraf('./CC/clientconfig/productconfig/trigger/surveydef/def1.js',function(err) {
      if (err) console.log(err);
    });
  } else console.log("No def1 existed at "+path+'\\CC\\clientconfig\\productconfig\\trigger\\surveydef');
  return ("done");
}

async function readFile(filename) {
  /* Read File */
  return new Promise(function(resolve, reject) {
    fs.readFile(filename, function read(err, data) {
      /* If an error exists, show it, otherwise show the file */
      if (err) {
        throw err;
      }  
      data = JSON.parse(data);
      resolve(data);
    });
  });
}

async function ccNpm(path) {
  spawn('npm', ['install'], { cwd: path+'/CC/', stdio: 'inherit', shell: true });
}

async function ccPrettify(path) {
  console.log(path);
  spawn('npx', ['prettier --write client_properties.js'], { cwd: path+'/CC/clientconfig/', stdio: 'inherit', shell: true })
  .on('error', function( err ){ throw err });
}

async function rpcPrettify(path) {
  spawn('npx', ['prettier --write productconfig/record/product_config.js'], { cwd: path+'/CC/clientconfig/', stdio: 'inherit', shell: true })
  .on('error', function( err ){ throw err });
}

async function tpcPrettify(path) {
  spawn('npx', ['prettier --write productconfig/trigger/product_config.js'], { cwd: path+'/CC/clientconfig/', stdio: 'inherit', shell: true })
  .on('error', function( err ){ throw err });
}

async function sdPrettify(path) {
  spawn('npx', ['prettier --write productconfig/trigger/surveydef/*'], { cwd: path+'/CC/clientconfig/', stdio: 'inherit', shell: true })
  .on('error', function( err ){ throw err });
}

async function test(path) {
  spawn('gulp', ['test_debug'], { cwd: path+'/CC/', stdio: 'inherit', shell: true })
    .on('error', function( err ){ throw err });
}

async function pushStg(path) {
  spawn('gulp', ['push_stg'], { cwd: path+'/CC/', stdio: 'inherit', shell: true })
    .on('error', function( err ){ throw err });
}

async function pushProd(path) {
  spawn('gulp', ['push_prod'], { cwd: 'CC/', stdio: 'inherit', shell: true })
    .on('error', function( err ){ throw err });
}


async function prettify(path){
  ccPrettify(path);
  rpcPrettify(path);
  tpcPrettify(path);
  sdPrettify(path);
}


module.exports = {
  readFile,
  ccClear,
  ccCopy,
  ccRename,
  ccNpm,
  configRebuild,
  assetsClear,
  assetsCopy,
  prettify,
  test,
  pushStg,
  pushProd
};