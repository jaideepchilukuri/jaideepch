var magic = require('./magic.js')

async function checkUID (config) {
    config = await magic.readFile(config);
    if (config) {
        for (def in config.trigger.surveydefs) {
            if(config.global.codeVer > '19.9.0' && def.uid == null) {
                console.log("UID required!");    
            }
        }
    }
}

async function checkCPP(config) {
    // check for function cpps, variable name vs var
    console.log("Checking CPPs..");
}

module.exports = { 
    checkUID,
    checkCPP
};