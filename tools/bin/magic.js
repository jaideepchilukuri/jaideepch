#!/usr/bin/env node

const program = require("commander");
const magic = require("../magic");
const spotcheck = require("../scripts/spotcheck");
const filesystem = require("../scripts/filesystem");
const other = require("../scripts/other");

const path = process.cwd() + "/tools/clientconfigs/";

program
  .command("summon [sitekeys...]")
  .alias("s")
  .description("Check out existing config for sitekey(s)")
  .option("-d --development", "Get custom config and assets from development")
  .option("-s --staging", "Get custom config and assets from staging")
  .option("-p --production", "Get custom config and assets from production")
  .action(wrap(getSitekey));

program
  .command("enchant [sitekeys...]")
  .alias("e")
  .description("Build client code package for sitekey(s)")
  .option("-u --upgrade", "Upgrade sitekey(s) to a version before building")
  .option("-c --conjure", "Start localhost test (for the first sitekey only)")
  .action(wrap(build));

program
  .command("conjure <sitekey>")
  .alias("c")
  .description("Start localhost test")
  .action(wrap(test));

program
  .command("reanimate [sitekeys...]")
  .alias("r")
  .description(
    "Rebuild config files in CC package after making changes to config.json"
  )
  .action(wrap(rebulidConfig));

program
  .command("facelift [sitekeys...]")
  .alias("f")
  .description("Move all desktop invites to modern invite")
  .action(wrap(modernize));

program
  .command("purge [sitekeys...]")
  .alias("w")
  .description(
    "Turn the sp to -1 on all definitions for both regular and mouseoff"
  )
  .action(wrap(turnOff));

program
  .command("trick <sitekey>")
  .alias("g")
  .description("Commit/push changes somewhere (but only if you use flags)")
  .option(
    "-d --pushdev",
    "Push changes to development container in fcp, commit and push changes back to github repo"
  )
  .option("-s --pushstg", "Push changes to staging container in fcp")
  .option("-p --pushprd", "Push changes to production container in fcp")
  .action(wrap(deploy));

program
  .command("vanquish [sitekeys...]")
  .alias("v")
  .description("Delete branch for sitekey(s)")
  .action(wrap(remove));

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

async function getSitekey(sitekeys, cmd) {
  console.log(
    "Creating local folders for sitekeys:",
    JSON.stringify(sitekeys),
    "Please wait..."
  );
  for (let counter = 0; counter < sitekeys.length; counter++) {
    await magic.skCopy(sitekeys[counter]);
    if (cmd.development) {
      await magic.getCustom(path, sitekeys[counter], "development");
    }
    if (cmd.staging) {
      await magic.getCustom(path, sitekeys[counter], "staging");
    }
    if (cmd.production) {
      await magic.getCustom(path, sitekeys[counter], "production");
    }
  }
}

async function upgradeChecks(sitekey) {
  await spotcheck.checkBlacklistFalse(path + sitekey + `/config.json`);
  await spotcheck.checkCPP(path + sitekey + `/config.json`);
  await spotcheck.checkUID(path + sitekey + `/config.json`);
  await spotcheck.checkLegacyDisplay(path + sitekey + `/config.json`);
}

async function prepCode(sitekey) {
  await magic.ccCopy(path + sitekey);
  await magic.ccStash(path + sitekey);
}

async function rebuildCCFiles(sitekey) {
  await magic.configRebuild(path + sitekey, sitekey);
  await magic.prettifyCC(path + sitekey);
}

async function rebuildAssets(sitekey) {
  await magic.assetsCopy(path + sitekey);
}

async function installNPM(sitekey) {
  await filesystem.makeDirIfMissing(`./tools/NPM`);
  await magic.npmRebuild(path + sitekey);
  await other.spawnProcess("npm", ["install"], {
    cwd: path + sitekey + "/CC/",
    stdio: "inherit",
    shell: true
  });
  await magic.npmStash(path + sitekey);
}

async function build(sitekeys, cmd) {
  console.log(
    "Building packages for sitekeys:",
    JSON.stringify(sitekeys),
    "Please wait..."
  );
  if (sitekeys.length > 0) {
    let codeVer = null;
    if (cmd.upgrade) {
      codeVer = other.askQuestion(
        "What code version would you like to upgrade to? "
      );
    }
    for (let counter = 0; counter < sitekeys.length; counter++) {
      await spotcheck.checkCustomerKey(
        path + sitekeys[counter] + `/config.json`
      );
      if (codeVer != null) {
        await upgradeChecks(sitekeys[counter]);
        await magic.updateCodeVersion(path + sitekeys[counter], codeVer);
        await other.spawnProcess("npx", [`prettier --write config.json`], {
          cwd: path + sitekeys[counter] + "/CC/",
          stdio: "inherit",
          shell: true
        });
      }
      await spotcheck.checkCodeVersion(
        path + sitekeys[counter] + `/config.json`
      );
      await spotcheck.checkTemplates(path + sitekeys[counter] + `/config.json`);
      await prepCode(sitekeys[counter]);
      await rebuildAssets(sitekeys[counter]);
      await rebuildCCFiles(sitekeys[counter]);
      await installNPM(sitekeys[counter]);
      console.log("Done building client code package");
    }
    if (cmd.conjure) {
      await test(sitekey[0]);
    }
  }
}

async function rebulidConfig(sitekeys) {
  console.log(
    "Rebuiliding config files for sitekeys:",
    JSON.stringify(sitekeys),
    "Please wait..."
  );
  for (let counter = 0; counter < sitekeys.length; counter++) {
    packagejson = await magic.readFile(
      path + sitekeys[counter] + "/CC/package.json"
    );
    config = await magic.readFile(path + sitekeys[counter] + "/config.json");
    if (
      packagejson &&
      packagejson.version &&
      config &&
      config.global &&
      config.global.codeVer
    ) {
      if (packagejson.version == config.global.codeVer) {
        console.log("Rebuilding configs for client code package");
        await rebuildAssets(sitekeys[counter]);
        await rebuildCCFiles(sitekeys[counter]);
      } else {
        console.log(
          "Changed code version! Building client code package from scratch"
        );
        await build(sitekeys[counter]);
      }
    }
  }
}

async function test(sitekey) {
  await other.spawnProcess("gulp", ["test_debug"], {
    cwd: path + sitekey + "/CC/",
    stdio: "inherit",
    shell: true
  });
}

async function modernize(sitekeys) {
  console.log(
    "Migrating to modern invite on desktop for sitekeys:",
    JSON.stringify(sitekeys),
    "Please wait..."
  );
  for (let counter = 0; counter < sitekeys.length; counter++) {
    let modernized = await magic.updateToModernInvite(path + sitekeys[counter]);
    if (modernized) {
      await other.spawnProcess("npx", [`prettier --write config.json`], {
        cwd: path + sitekeys[counter] + "/CC/",
        stdio: "inherit",
        shell: true
      });
      await magic.configRebuild(path + sitekeys[counter], sitekeys[counter]);
      await magic.prettifyCC(path + sitekeys[counter]);
      console.log("You have just modernized " + sitekeys[counter]);
    }
  }
}

async function turnOff(sitekeys) {
  console.log(
    "Turning off trigger collection for sitekeys:",
    JSON.stringify(sitekeys),
    "Please wait..."
  );
  for (let counter = 0; counter < sitekeys.length; counter++) {
    let turnedoff = await magic.fullDefection(path + sitekeys[counter]);
    if (turnedoff) {
      await other.spawnProcess("npx", [`prettier --write config.json`], {
        cwd: path + sitekeys[counter] + "/CC/",
        stdio: "inherit",
        shell: true
      });
      await magic.configRebuild(path + sitekeys[counter], sitekeys[counter]);
      await magic.prettifyCC(path + sitekeys[counter]);
      console.log("Turned all sp to -1 for sitekey " + sitekeys[counter]);
    }
  }
}

async function deploy(sitekey, cmd) {
  if (!cmd) {
    console.log(
      "Now you see me, now you don't... (I did nothing, please try again with an options flag if you wanted something done)"
    );
  }
  if (cmd.pushdev) {
    let pushedtogithub = await commitAndPushToGithub(sitekey);
    let pusheddevconfig = await magic.pushCxSuiteConfigsToDevContainer(
      path + sitekey
    );
    let pusheddev = await other.spawnProcess("gulp", ["push_products"], {
      cwd: path + sitekey + "/CC/",
      stdio: "inherit",
      shell: true
    });
    if (pushedtogithub && pusheddevconfig && pusheddev) {
      console.log("Pushed to development on sitekey " + sitekey);
    }
  }
  if (cmd.pushstg) {
    let pushedstg = await other.spawnProcess("gulp", ["push_stg"], {
      cwd: path + sitekey + "/CC/",
      stdio: "inherit",
      shell: true
    });
    if (pushedstg) {
      console.log("Pushed to staging on sitekey " + sitekey);
    }
  }
  if (cmd.pushprd) {
    let pushedprod = await other.spawnProcess("gulp", ["push_prod"], {
      cwd: path + sitekey + "/CC/",
      stdio: "inherit",
      shell: true
    });
    if (pushedprod) {
      console.log("Pushed to production on sitekey " + sitekey);
    }
  }
}

async function remove(sitekeys) {
  console.log(
    "Deleting local folders for sitekeys:",
    JSON.stringify(sitekeys),
    "Please wait..."
  );
  for (let counter = 0; counter < sitekeys.length; counter++) {
    let deleted = await magic.deleteBranch(path + sitekeys[counter]);
    if (deleted) {
      console.log("Deleted " + sitekeys[counter] + " branch locally");
    }
  }
}

async function commitAndPushToGithub(sitekey) {
  await other.doAGit([
    `--git-dir=tools/clientconfigs/${sitekey}/.git`,
    "add",
    "."
  ]);
  let message = other.askQuestion("What changes are you committing? ");
  await other.doAGit([
    `--git-dir=tools/clientconfigs/${sitekey}/.git`,
    "commit",
    "-m",
    `${message}`
  ]);
  let committed = await other.doAGit([
    `--git-dir=tools/clientconfigs/${sitekey}/.git`,
    "push",
    `https://github.com/foreseecode/websdk-client-configs.git/`
  ]);
  if (committed) {
    console.log("Committed changes on " + sitekey + " back to repo");
  }
  let commitnum = other.doAGit([
    `--git-dir=tools/clientconfigs/${sitekey}/.git`,
    "log",
    "--pretty=%h",
    "-1"
  ]);
  message = other.askQuestion("What ticket number in SalesForce is this for? ");
  console.log(
    `Please paste this in as your fcp push comment: SF Ticket#: ${message}  Git Commit: ${commitnum}`
  );
  return true;
}
