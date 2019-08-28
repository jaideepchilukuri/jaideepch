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
  let codeVersion = null;
  if(jconfig && jconfig.global && jconfig.global.codeVer)
    codeVersion = jconfig.global.codeVer;
  return codeVersion;
}

function addEmptyDefs(customObj,emptyObj) {
  let emptyDef = emptyObj.trigger.surveydefs[0];
  emptyObj.trigger.surveydefs=[];
  for(var def in customObj.trigger.surveydefs) {
    //console.log(def)
    emptyObj.trigger.surveydefs.push(emptyDef);
  }
  //console.log(emptyObj.trigger.surveydefs)
  return emptyObj;
}

function unbaseDefs(Obj) {
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

function returnEmptyConfig(codeVersion) {
  let codeVersionWithDashes = codeVersion.replace(/\./g,'-');
  let emptyConfigUrl = `https://gateway-elb.foresee.com/sites/emptyconfigs/${codeVersionWithDashes}/config.json`;
  //make the call to the url to retrieve the empty config
  let resp = syncrequest('GET',emptyConfigUrl);
  let respbody = resp.getBody('utf8');
  respbody = JSON.parse(respbody);
  respbody = addEmptyDefs(jconfig,respbody);
  //  semver for comparing against 19.9.0
  if(codeVersion=='19.3.2-v.2'||codeVersion=='19.3.2-v.3'||codeVersion=='19.3.3-v.2'||codeVersion=='19.3.3-v.3'||codeVersion=='19.3.7-hf.1'||codeVersion<'19.9.0') {
    // unbase64 the surveydefs
    respbody = unbaseDefs(respbody);
  }
  return respbody;
}

function returnCombinedConfig(customObj,emptyObj,isSpecialArray) {
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
          retTempObj[counter]=returnCombinedConfig(customObj[counter],emptyObj[counter],false);
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
        var tempObj=returnCombinedConfig(customObj[objKey],emptyObj[objKey],specialArr);
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

async function ccClear(filepath) {
  return new Promise(function(resolve, reject) {
    var path = filepath + '/CC';
    if(fs.existsSync(path)) {
	    console.log("Deleting the CC folder");
	    rimraf(path, function(err) {
        if (err) console.log(err);
        console.log("Deleted CC folder");
      });
    } else console.log("No folder existed at "+filepath+'\\CC');
    resolve();
  });  
}

gulp.task('cc-clear', function (cb) {
  if(fs.existsSync('./CC')) {
	  console.log("Deleting the CC folder");
	  rimraf('./CC',cb);
  } else console.log("No folder existed at "+__dirname+'\\CC');
  cb();
});

async function ccCopy(config, path) {
  jconfig = await readFile(config);
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
    });
  });
};

gulp.task('cc-copy', function (cb) {
  process.nextTick(function () {
    let codeVersion = returnCodeVersion();
    let repoUrl = 'https://github.com/foreseecode/client_code.git';
    if(codeVersion=='19.3.2-v.2'||codeVersion=='19.3.2-v.3'||codeVersion=='19.3.3-v.2'||codeVersion=='19.3.3-v.3'||codeVersion=='19.3.7-hf.1'||codeVersion<'19.9.0')
      repoUrl = 'https://github.com/foreseecode/client_code_template.git';
    console.log('Copying Code Version',codeVersion,'from Repo Url',repoUrl);
    if(codeVersion==null)
      err="Code Version not defined in config.json > global > codeVer";
    // Now go get the client code
    gitsync({
      'dest': '.',
      'repo': repoUrl,
      'branch': codeVersion
    }, function (err) {
      if (err) {
        console.log("Error getting client code!", err);
        return;
      }
      if (cb) {
        cb();
      }
    });
  });
});

async function ccRename(config, path) {
  jconfig = await readFile(config);
  let codeVersion = await returnCodeVersion();
  if(codeVersion==null)
    err="Code Version not defined in config.json > global > codeVer";
  fs.rename(path+'\\'+codeVersion, './CC', function (err) {
    if (err) {
      throw err;
    }
  });
};

gulp.task('cc-rename', function (cb) {
  let codeVersion = returnCodeVersion();
  if(codeVersion==null)
    err="Code Version not defined in config.json > global > codeVer";
  fs.rename('./'+codeVersion, './CC', function (err) {
    if (err) {
      throw err;
    }
    cb();
  });
});

async function ejsClear(path) {
  if(fs.existsSync(path+'/EJS')) {
	  console.log("Deleting the EJS folder");
	  rimraf(path, function(err) {
      if (err) console.log(err);
      console.log("Deleted EJS folder");
    });
  } else console.log("No folder existed at "+path+'\\EJS');
}

gulp.task('ejs-clear', function (cb) {
  if(fs.existsSync('./EJS')) {
	  console.log("Deleting the EJS folder");
	  rimraf('./EJS',cb);
  } else console.log("No folder existed at "+__dirname+'\\EJS');
  cb();
});

gulp.task('ejs-copy', function (cb) {
  process.nextTick(function () {
    let codeVersion = returnCodeVersion();
    let repoUrl = 'https://github.com/foreseecode/websdk_templates.git';
    console.log('Copying Code Version',codeVersion,'from Repo Url',repoUrl);
    if(codeVersion==null)
      err="Code Version not defined in config.json > global > codeVer";
    // Now go get the EJS templates
    gitsync({
      'dest': '.',
      'repo': repoUrl,
      'branch': codeVersion
    }, function (err) {
      if (err) {
        console.log("Error getting templates!", err);
        return;
      }
      if (cb) {
        cb();
      }
    });
  });
});

gulp.task('ejs-rename', function (cb) {
  let codeVersion = returnCodeVersion();
  if(codeVersion==null)
    err="Code Version not defined in config.json > global > codeVer";
  fs.rename('./'+codeVersion, './EJS', function (err) {
    if (err) {
      throw err;
    }
    cb();
  });
});

/**
 * Delete assets folder if it exists
 */
gulp.task('assets-clear', function(cb) {
  if(fs.existsSync('./CC/clientconfig/productconfig/trigger/assets')) {
    console.log("Clearing the trigger assets folder");
    rimraf.sync('./CC/clientconfig/productconfig/trigger/assets/*');
  } else console.log("No folder existed at "+dirname+"\\CC\\clientconfig\\productconfig\\trigger\\assets");
  cb();
});

/**
 * Copies assets from top level folder
 */
gulp.task('assets-copy', function(cb) {
  copydir.sync('./assets', './CC/clientconfig/productconfig/trigger/assets/', {
    utimes: false,
    mode: false,
    cover: false,
  });
  cb();
});

gulp.task('config-rebuild', function(cb) {
  let codeVersion = returnCodeVersion();
  let econfig = returnEmptyConfig(codeVersion);
  let codeVersionWithDashes = codeVersion.replace(/\./g,'-');
  
  //console.log("EmptyConfig:",econfig);
  let combinedconfig = returnCombinedConfig(jconfig,econfig,false);
  // then the logic to rebuild from that into the actual files

  let cptemplate = fs.readFileSync(`./EJS/${codeVersion}/client_properties.ejs`,"utf-8");/*,function (err) {
	  if (err) throw err;
  });*/
  let rpctemplate = fs.readFileSync(`./EJS/${codeVersion}/record_productconfig.ejs`,"utf-8");/*,function (err) {
	   if (err) throw err;
   });*/
  let tpctemplate = fs.readFileSync(`./EJS/${codeVersion}/trigger_productconfig.ejs`,"utf-8");/*,function (err) {
	   if (err) throw err;
  });*/
  let sdtemplate = fs.readFileSync(`./EJS/${codeVersion}/surveydef.ejs`,"utf-8");/*,function (err) {
	   if (err) throw err;
   });*/
  
  // console.log(cptemplate);
  // console.log(combinedconfig);
  
  let filecontents = ejs.render(cptemplate, {combinedconfig: combinedconfig}, {delimiter: '%'});
  console.log(filecontents);
	fs.writeFileSync('./CC/clientconfig/client_properties.js',filecontents,function (err) {
	  if (err) throw err;
  });
  
  filecontents = ejs.render(rpctemplate, {combinedconfig: combinedconfig}, {delimiter: '%'});
  console.log(filecontents);
	fs.writeFileSync('./CC/clientconfig/productconfig/record/product_config.js',filecontents,function (err) {
	   if (err) throw err;
  });  
  
  filecontents = ejs.render(tpctemplate, {combinedconfig: combinedconfig}, {delimiter: '%'});
  console.log(filecontents);
  fs.writeFileSync('./CC/clientconfig/productconfig/trigger/product_config.js',filecontents,function (err) {
	  if (err) throw err;
  });
  
  for(var def in combinedconfig.trigger.surveydefs){
    filecontents = ejs.render(sdtemplate, {surveydef: combinedconfig.trigger.surveydefs[def]}, {delimiter: '%'});
    console.log(filecontents);
    let tempstring = '0';
    if (def<10){tempstring='00';};
    fs.writeFileSync(`./CC/clientconfig/productconfig/trigger/surveydef/def${tempstring}${def}.js`,filecontents,function (err) {
      if (err) throw err;
    });
  }

  if(fs.existsSync('./CC/clientconfig/productconfig/trigger/surveydef/def0.js')) {
	  console.log("Deleting def0 from the surveydef folder");
	  rimraf('./CC/clientconfig/productconfig/trigger/surveydef/def0.js',cb);
  } else console.log("No def0 existed at "+__dirname+'\\CC\\clientconfig\\productconfig\\trigger\\surveydef');

  if(fs.existsSync('./CC/clientconfig/productconfig/trigger/surveydef/def1.js')) {
	  console.log("Deleting def1 from the surveydef folder");
	  rimraf('./CC/clientconfig/productconfig/trigger/surveydef/def1.js',cb);
  } else console.log("No def1 existed at "+__dirname+'\\CC\\clientconfig\\productconfig\\trigger\\surveydef');
  
  cb();
});

gulp.task('cc-npm', function (cb) {
  spawn('npm', ['install'], { cwd: 'CC/', stdio: 'inherit', shell: true })
    .on('close', cb);
});

gulp.task('cp-prettify', function(cb) {
  spawn('npx', ['prettier --write client_properties.js'], { cwd: 'CC/clientconfig/', stdio: 'inherit', shell: true })
    .on('close', cb);
});

gulp.task('rpc-prettify', function(cb) {
  spawn('npx', ['prettier --write productconfig/record/product_config.js'], { cwd: 'CC/clientconfig/', stdio: 'inherit', shell: true })
    .on('close', cb);
});

gulp.task('tpc-prettify', function(cb) {
  spawn('npx', ['prettier --write productconfig/trigger/product_config.js'], { cwd: 'CC/clientconfig/', stdio: 'inherit', shell: true })
    .on('close', cb);
});

gulp.task('sd-prettify', function(cb) {
  spawn('npx', ['prettier --write productconfig/trigger/surveydef/*'], { cwd: 'CC/clientconfig/', stdio: 'inherit', shell: true })
    .on('close', cb);
});

gulp.task('cc-prettify', gulp.series(
  'cp-prettify',
  'rpc-prettify',
  'tpc-prettify',
  'sd-prettify'
), function (cb) {});

gulp.task('cc-custom', gulp.series(
  'assets-clear',
  'assets-copy',
  'config-rebuild',
  'cc-prettify'
), function (cb) {});

gulp.task('cc-debug', function (cb) {
  spawn('gulp', ['test_debug'], { cwd: 'CC/', stdio: 'inherit', shell: true })
    .on('close', cb);
});

gulp.task('ejs-prep', gulp.series(
  'ejs-clear',
  'ejs-copy',
  'ejs-rename'
), function (cb) {});

gulp.task('cc-prep', gulp.series(
  'cc-clear',
  'cc-copy',
  'cc-rename',
  'ejs-prep',
  'cc-npm',
  'cc-custom',
  'cc-debug'
), function (cb) {});

gulp.task('cc-stg', function (cb) {
  spawn('gulp', ['push_stg'], { cwd: 'CC/', stdio: 'inherit', shell: true })
    .on('close', cb);
});

gulp.task('cc-prod', function (cb) {
  spawn('gulp', ['push_prod'], { cwd: 'CC/', stdio: 'inherit', shell: true })
    .on('close', cb);
});

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

module.exports = {
  readFile,
  ccClear,
  ccCopy,
  ccRename,
  ejsClear,
};