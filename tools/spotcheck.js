var magic = require('./magic.js'),
    syncrequest = require('sync-request'),
    fs = require('fs')

async function checkUID (config) {
    jconfig = await magic.readFile(config);
    let codeVersion = jconfig.global.codeVer;
    let codeVersionWithDashes = codeVersion.replace(/\./g, '-');
    let emptyConfigUrl = `http://gateway-elb.foresee.com/sites/emptyconfigs/${codeVersionWithDashes}/config.json`;
    let resp = syncrequest('GET', emptyConfigUrl);
    let respbody = resp.getBody('utf8');
    respbody = JSON.parse(respbody);
    return new Promise(function (resolve, reject) {
        if (jconfig && jconfig.trigger && jconfig.trigger.surveydefs && respbody.trigger.surveydefs[0].uid==null) {
            console.log("uid null");
            for (def of jconfig.trigger.surveydefs) {
                if(!def.uid) {
                    let newUID = syncrequest('GET', 'https://www.uuidgenerator.net/api/version4');
                    newUID = newUID.getBody('utf8');
                    console.log(newUID);
                    newUID = newUID.replace(/\\n/g, '');
                    console.log(newUID);
                }
            }
            let jconfigFile = JSON.stringify(jconfig);
            fs.writeFileSync(config, jconfigFile, function (err) {
            if (err) {
                return reject(err);
            }
            });
            magic.customPrettify(config);
        }
        return resolve();
    });
}

async function checkCPP(config) {
    // check for function cpps, variable name vs var
    console.log("Checking CPPs..");
    config = await magic.readFile(config);
    if (config && config.trigger.config.cpps) {
        console.log(config.trigger.config.cpps);
        for (cpp in config.trigger.config.cpps) {
           //check if function cpp and code version >=19.3.3
           //check variable cpp name vs var vs code version
        }
    }
}

module.exports = { 
    checkUID,
    checkCPP
};