#!/usr/bin/env node

const program = require("commander");
const magic = require("../magic");
const spotcheck = require("../spotcheck");
const git = require("simple-git/promise")();
const fs = require('fs');
const path = process.cwd();

var cconfig;

//{assumption that this tool is added to path already, figure out what modules are needed}

program
  .command("get <sitekey>")
  .alias("g")
  .description("Check out a sitekey's existing config")
  .action(wrap(getSitekey))
  
program   
  .command("build")
  .alias("b")
  .description("Build client code package")
  .action(wrap(build))

program
  .command("test")
  .alias("t")
  .description("Start localhost server to test")
  .action(wrap(test))

program
  .command("pushstg")
  .alias("s")
  .description("Push to staging")
  .action(wrap(pushStg))

program
  .command("pushprod")
  .alias("p")
  .description("Push to production")
  .action(wrap(pushProd))
  
program.parse(process.argv);


// //the thing here that wraps functions with async
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
  //look at all branches in websdk-client-configs
  //if any branch==sitekey, checkout branch
  //otherwise create new branch named sitekey 
  const branches = await git.branchLocal();
  const hasLocalBranch = branches.branches[sitekey];
  if (hasLocalBranch) {
      // use existing branch for the sitekey
      console.log("Checking out existing branch for", sitekey);
      await git.checkout(sitekey);
  } else {
      // create a new branch for the sitekey
      console.log("Creating branch for", sitekey);
      await git.checkout(["-b", sitekey]);
  }
  console.log("Checked out websdk-client-configs branch for sitekey ", sitekey);
}


async function prepCode() {
  let cleared = await magic.ccClear(path);
  if (cleared) {
    console.log("CC cleared");
    let copied = await magic.ccCopy('config.json', path);
    if (copied) {
      console.log("empty config copied");
      let renamed = await magic.ccRename('config.json', path);
      if (renamed){
        console.log(renamed);
        return renamed;
      }
    }
  }
}

async function build() {
  let prep = await prepCode();
  await magic.ccNpm(path);
  if (prep) {
    let assetsclear = await magic.assetsClear(path);
    if (assetsclear) {
      let assetscopy = await magic.assetsCopy(path);
      if (assetscopy) {
        let rebuild = await magic.configRebuild('config.json', path);
        if (rebuild) {
          await magic.prettify(path);
          console.log("Done building client code package");
          await spotcheck.checkUID('config.json');
        }
      }
    }
  }
}

async function test() {
  await magic.test(path);
}

async function pushStg() {
  let pushedstg = await magic.pushStg(path);
  if (pushedstg) {
    console.log("Pushed to staging");
  }
}

async function pushProd() {
  let pushedprod = await magic.pushProd(path);
  if (pushedprod) {
    console.log("Pushed to production");
  }
}