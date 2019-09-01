var magic = require('./magic.js')

async function checkUID (config) {
    config = await magic.readFile(config);
    if (config) {
        for (def in config.trigger.surveydefs) {
            if(config.global.codeVer > '19.9.0' && def.uid == null) {
                console.err("UID required!");    
            }
        }
    }
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