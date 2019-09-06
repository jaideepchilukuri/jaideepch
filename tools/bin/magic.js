#!/usr/bin/env node

const program = require("commander");
const magic = require("../magic");
const spotcheck = require("../spotcheck");
const git = require("simple-git/promise")();
const fs = require('fs');
const path = process.cwd()+'\\tools\\clientconfigs\\';

var cconfig;

//obliterate, banish, vanish, vanquish, enchant, cast, exile

program
  .command("summon <sitekey>")
  .alias("s")
  .description("Check out a sitekey's existing config")
  .action(wrap(getSitekey))
  
program   
  .command("enchant <sitekey>")
  .alias("e")
  .description("Build client code package for sitekey")
  .option("-c --conjure", "Start localhost test")
  .action(wrap(build))

program
  .command("conjure <sitekey>")
  .alias("c")
  .description("Start localhost test")
  .action(wrap(test))

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

async function getSitekey(sitekey) {
  await magic.skClear(path+sitekey);
  await magic.skCopy(sitekey);
}


async function prepCode(sitekey) {
  await magic.ccClear(path+sitekey);
  console.log("CC cleared");
  await magic.ccCopy(path+sitekey);
  console.log("empty config copied");
  await magic.ccRename(path+sitekey);
  console.log("empty config renamed");
}

async function build(sitekey, cmd) {
  await prepCode(sitekey);
  await magic.assetsClear(path+sitekey);
  await magic.assetsCopy(path+sitekey);
  await magic.configRebuild(path+sitekey);
  await magic.prettify(path+sitekey);
  await magic.ccNpm(path+sitekey);
  console.log("Done building client code package");
  if (cmd.conjure) {
    await test(sitekey);
  }
}

async function test(sitekey) {
  await magic.test(path+sitekey);
}

async function pushStg(sitekey) {
  let pushedstg = await magic.pushStg(path+sitekey);
  if (pushedstg) {
    console.log("Pushed to staging");
  }
}

async function pushProd(sitekey) {
  let pushedprod = await magic.pushProd(path+sitekey);
  if (pushedprod) {
    console.log("Pushed to production");
  }
}