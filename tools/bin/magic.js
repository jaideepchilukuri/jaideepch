#!/usr/bin/env node

const program = require("commander");
const magic = require("../magic");
const spotcheck = require("../spotcheck");
const git = require("simple-git/promise")();
const fs = require('fs');
const readline = require('readline-sync');

const path = process.cwd()+'/tools/clientconfigs/';

program
  .command("summon <sitekey> [sitekeys...]")
  .alias("s")
  .description("Check out existing config for sitekey(s)")
  .option("-s --staging", "Get custom config and assets from staging")
  .option("-p --production", "Get custom config and assets from production")
  .action(wrap(getSitekey))
  
program   
  .command("enchant <sitekey> [sitekeys...]")
  .alias("e")
  .description("Build client code package for sitekey(s)")
  .option("-u --upgrade", "Upgrade sitekey(s) to a version before building")
  .option("-c --conjure", "Start localhost test (for the first sitekey only)")
  .action(wrap(build))

program
  .command("conjure <sitekey>")
  .alias("c")
  .description("Start localhost test")
  .action(wrap(test))

program 
  .command("reanimate <sitekey> [sitekeys...]")
  .alias("r")
  .description("Rebuild config files in CC package after making changes to config.json")
  .action(wrap(rebulidConfig))

program
  .command("facelift <sitekey> [sitekeys...]")
  .alias("f")
  .description("Move all desktop invites to modern invite")
  .action(wrap(modernize))

program
  .command("purge <sitekey> [sitekeys...]")
  .alias("w")
  .description("Turn the sp to -1 on all definitions for both regular and mouseoff")
  .action(wrap(turnOff))

program
  .command("pushstg <sitekey>")
  .alias("s")
  .description("Push to staging")
  .action(wrap(pushStg))

program
  .command("pushprod <sitekey>")
  .alias("p")
  .description("Push to production")
  .action(wrap(pushProd))
  
program
  .command("commit <sitekey> <message>")
  .alias("g")
  .description("Commit back to git")
  .option("-p --push", "Push changes after commit")
  .action(wrap(commit))

program
  .command("vanquish <sitekey> [sitekeys...]")
  .alias("v")
  .description("Delete branch for sitekey(s)")
  .action(wrap(vanquish))

program.parse(process.argv);

function wrap(fn) {
  return function(...args) {
    return fn(...args).catch(err => {
      console.error(err);
      process.exit(1);
      return null;
    });
  };
}

async function getSitekey(sitekey, sitekeys, cmd) {
  sitekeys.unshift(sitekey)
  for(let counter=0;counter<sitekeys.length;counter++) {
    await magic.skClear(path+sitekeys[counter]);
    await magic.skCopy(sitekeys[counter]);
    if (cmd.staging) {
      await magic.getCustom(path, sitekeys[counter], "staging");
    }
    if (cmd.production) {
      await magic.getCustom(path, sitekeys[counter], "production");
    }
  }
}

async function prepCode(sitekey) {
  await magic.ccClear(path+sitekey);
  await magic.ccCopy(path+sitekey);
  await magic.ccStash(path+sitekey);
}

async function build(sitekey, sitekeys, cmd) {
  let codeVer = null;
  if(cmd.upgrade) {
    codeVer = readline.question('What code version would you like to upgrade to? ');
  }
  if (codeVer == 0 || codeVer == 'null' || codeVer == 'n' || !codeVer) {
    codeVer = null;
  }
  sitekeys.unshift(sitekey)
  for(let counter=0;counter<sitekeys.length;counter++) {
    await spotcheck.checkCustomerKey(path+sitekeys[counter]+`/config.json`);
    if (codeVer != null) {
      await spotcheck.checkBlacklistFalse(path+sitekeys[counter]+`/config.json`);
      await spotcheck.checkCPP(path+sitekeys[counter]+`/config.json`);
      await spotcheck.checkUID(path+sitekeys[counter]+`/config.json`);
      await spotcheck.checkLegacyDisplay(path+sitekeys[counter]+`/config.json`);
      await magic.updateCodeVersion(path+sitekeys[counter],codeVer);
    }
    await spotcheck.checkCodeVersion(path+sitekeys[counter]+`/config.json`);
    await prepCode(sitekeys[counter]);
    await magic.assetsClear(path+sitekeys[counter]);
    await magic.assetsCopy(path+sitekeys[counter]);
    await magic.configRebuild(path+sitekeys[counter], sitekeys[counter]);
    await magic.prettify(path+sitekeys[counter]);
    await magic.customPrettify(path+sitekeys[counter], `config.json`);
    if (!fs.existsSync(`./tools/NPM`)){
      fs.mkdirSync(`./tools/NPM`);
    }
    await magic.npmRebuild(path+sitekeys[counter]);
    await magic.ccNpm(path+sitekeys[counter]);
    await magic.npmStash(path+sitekeys[counter]);
    console.log("Done building client code package");
    await spotcheck.checkTemplates(path+sitekeys[counter]+`/config.json`);
  }
  if (cmd.conjure) {
    await test(sitekey);
  }
}

async function rebulidConfig(sitekey, sitekeys) {
  sitekeys.unshift(sitekey)
  for(let counter=0;counter<sitekeys.length;counter++) {
    packagejson = await magic.readFile(path+sitekeys[counter]+'/CC/package.json');
    config = await magic.readFile(path+sitekeys[counter]+'/config.json');
    if(packagejson && packagejson.version && config && config.global && config.global.codeVer) {
      if(packagejson.version == config.global.codeVer) {
        console.log("Rebuilding configs for client code package");
        await magic.assetsClear(path+sitekeys[counter]);
        await magic.assetsCopy(path+sitekeys[counter]);
        await magic.configRebuild(path+sitekeys[counter], sitekeys[counter]);
        await magic.prettify(path+sitekeys[counter]);
        await magic.ccNpm(path+sitekeys[counter]);
      }
      else {
        console.log("New code version! Building client code package");
        await build(sitekeys[counter]);
      }
    }
  }
}

async function test(sitekey) {
  await magic.test(path+sitekey);
}

async function modernize(sitekey, sitekeys) {
  sitekeys.unshift(sitekey);
  for(let counter=0;counter<sitekeys.length;counter++) {
    let modernized = await magic.updateToModernInvite(path+sitekeys[counter]);
    if (modernized) {
      await magic.configRebuild(path+sitekeys[counter], sitekeys[counter]);
      await magic.prettify(path+sitekeys[counter]);
      await magic.customPrettify(path+sitekeys[counter], `config.json`);
      console.log("You have just modernized "+sitekeys[counter]);
    }
  }
}

async function turnOff(sitekey, sitekeys) {
  sitekeys.unshift(sitekey)
  for(let counter=0;counter<sitekeys.length;counter++) {
    let turnedoff = await magic.fullDefection(path+sitekeys[counter]);
    if (turnedoff) {
      await magic.configRebuild(path+sitekeys[counter], sitekeys[counter]);
      await magic.prettify(path+sitekeys[counter]);
      await magic.customPrettify(path+sitekeys[counter], `config.json`);
      console.log("Turned all sp to -1 for sitekey "+sitekeys[counter]);
    }
  }
}

async function pushStg(sitekey) {
  let pushedstg = await magic.pushStg(path+sitekey);
  if (pushedstg) {
    console.log("Pushed to staging on sitekey "+sitekey);
  }
}

async function pushProd(sitekey) {
  let pushedprod = await magic.pushProd(path+sitekey);
  if (pushedprod) {
    console.log("Pushed to production on sitekey "+sitekey);
  }
}

async function commit(sitekey, message, cmd) {
  await magic.gitAdd(sitekey);
  let committed = await magic.gitCommit(sitekey, message);
  if (committed) {
    console.log("Committed changes on " + sitekey + " back to repo");
  }
  if (cmd.push){
    await magic.gitPush(sitekey);
  }
}

async function vanquish(sitekey, sitekeys) {
  sitekeys.unshift(sitekey)
  for(let counter=0;counter<sitekeys.length;counter++) {
    await magic.deleteBranch(path+sitekeys[counter]);
    console.log("Branch "+sitekeys[counter]+" deleted");
  }
}
