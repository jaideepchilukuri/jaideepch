const helpertasks = require("./helpertasks"),
  spotcheck = require("./spotcheck"),
  filesystem = require("./filesystem"),
  other = require("./other");

const path =
  process.cwd().substr(process.cwd().length - 6, 6) == "\\tools" // "/tools" doesn't work, tried it, so I hope this doesn't cause an error on mac
    ? `${process.cwd()}/clientconfigs/`
    : `${process.cwd()}/tools/clientconfigs/`;

async function getSitekey(sitekeys, cmd) {
  console.log("Creating local folders for sitekeys:", JSON.stringify(sitekeys), "Please wait...");
  for (counter in sitekeys) {
    await helpertasks.skCopy(path + sitekeys[counter]);
    //maybe make next three lines into an array and make getcustom take an array?
    if (cmd.development) {
      await helpertasks.getCustom(path, sitekeys[counter], "development");
    }
    if (cmd.staging) {
      await helpertasks.getCustom(path, sitekeys[counter], "staging");
    }
    if (cmd.production) {
      await helpertasks.getCustom(path, sitekeys[counter], "production");
    }
  }
}

async function build(sitekeys, cmd) {
  console.log("Building packages for sitekeys:", JSON.stringify(sitekeys), "Please wait...");
  if (sitekeys.length > 0) {
    let newCodeVer = null;
    if (cmd.upgrade) {
      newCodeVer = await other.askQuestion("What code version would you like to upgrade to? ");
    }
    for (counter in sitekeys) {
      await spotcheck.checkCustomerKey(path + sitekeys[counter] + `/config.json`);
      if (newCodeVer != null) {
        console.log(`Rebuilding for version ${newCodeVer}...`);
        await helpertasks.upgradeChecks(path + sitekeys[counter]);
        await helpertasks.updateCodeVersion(path + sitekeys[counter], newCodeVer);
      }
      await spotcheck.checkCodeVersion(path + sitekeys[counter]);
      await other.spawnProcess("npx", [`prettier --write config.json`], {
        cwd: path + sitekeys[counter],
        stdio: "inherit",
        shell: true,
      });
      await spotcheck.checkForCustomTemplates(path + sitekeys[counter] + `/config.json`);
      await helpertasks.ccCopy(path + sitekeys[counter]);
      await helpertasks.assetsCopy(path + sitekeys[counter]);
      await helpertasks.configRebuild(path + sitekeys[counter]);
      await helpertasks.prettifyCC(path + sitekeys[counter]);
      await helpertasks.installNPM(path + sitekeys[counter]);
      console.log("Done building client code package");
    }
    if (cmd.conjure) {
      await test(sitekey[0]);
    }
  }
}

async function rebulidConfig(sitekeys) {
  console.log("Rebuiliding config files for sitekeys:", JSON.stringify(sitekeys), "Please wait...");
  for (counter in sitekeys) {
    packagejson = await filesystem.readFileToObjectIfExists(path + sitekeys[counter] + "/CC/package.json");
    config = await filesystem.readFileToObjectIfExists(path + sitekeys[counter] + "/config.json");
    if (packagejson && packagejson.version && config && config.global && config.global.codeVer) {
      if (packagejson.version == config.global.codeVer) {
        console.log("Rebuilding configs for client code package");
        await helpertasks.assetsCopy(path + sitekeys[counter]);
        await helpertasks.configRebuild(path + sitekeys[counter]);
        await helpertasks.prettifyCC(path + sitekeys[counter]);
      } else {
        console.log("Changed code version! Building client code package from scratch");
        await build(path + sitekeys[counter]);
      }
    }
  }
}

async function test(sitekey) {
  await other.spawnProcess("gulp", ["test_debug"], {
    cwd: path + sitekey + "/CC/",
    stdio: "inherit",
    shell: true,
  });
}

async function modernize(sitekeys) {
  console.log("Migrating to modern invite on desktop for sitekeys:", JSON.stringify(sitekeys), "Please wait...");
  for (counter in sitekeys) {
    let modernized = await helpertasks.updateToModernInvite(path + sitekeys[counter]);
    if (modernized) {
      await other.spawnProcess("npx", [`prettier --write config.json`], {
        cwd: path + sitekeys[counter],
        stdio: "inherit",
        shell: true,
      });
      await helpertasks.configRebuild(path + sitekeys[counter], sitekeys[counter]);
      await helpertasks.prettifyCC(path + sitekeys[counter]);
      console.log("You have just modernized " + sitekeys[counter]);
    }
  }
}

async function turnOff(sitekeys) {
  console.log("Turning off trigger collection for sitekeys:", JSON.stringify(sitekeys), "Please wait...");
  for (counter in sitekeys) {
    let turnedoff = await helpertasks.fullDefection(path + sitekeys[counter]);
    if (turnedoff) {
      await other.spawnProcess("npx", [`prettier --write config.json`], {
        cwd: path + sitekeys[counter],
        stdio: "inherit",
        shell: true,
      });
      await helpertasks.configRebuild(path + sitekeys[counter], sitekeys[counter]);
      await helpertasks.prettifyCC(path + sitekeys[counter]);
      console.log("Turned all sp to -1 for sitekey " + sitekeys[counter]);
    }
  }
}

async function deploy(sitekey, cmd) {
  if (!cmd.pushdev && !cmd.pushstg && !cmd.pushprd) {
    console.log(
      "Now you see me, now you don't... (I did nothing, please try again with an options flag if you wanted something done)"
    );
  }
  if (cmd.pushdev) {
    let pushedtogithub = await helpertasks.commitAndPushToGithub(path + sitekey);
    let pusheddevconfig = await helpertasks.pushCxSuiteConfigsToDevContainer(path + sitekey);
    await other.spawnProcess("npx", [`prettier --write config.json`], {
      cwd: path + sitekey,
      stdio: "inherit",
      shell: true,
    });
    let pusheddev = await other.spawnProcess("gulp", ["push_products"], {
      cwd: path + sitekey + "/CC/",
      stdio: "inherit",
      shell: true,
    });
    if (pushedtogithub && pusheddevconfig && pusheddev) {
      console.log("Pushed to development on sitekey " + sitekey);
    }
  }
  if (cmd.pushstg) {
    let pushedstg = await other.spawnProcess("gulp", ["push_stg"], {
      cwd: path + sitekey + "/CC/",
      stdio: "inherit",
      shell: true,
    });
    if (pushedstg) {
      console.log("Pushed to staging on sitekey " + sitekey);
    }
  }
  if (cmd.pushprd) {
    let pushedprod = await other.spawnProcess("gulp", ["push_prod"], {
      cwd: path + sitekey + "/CC/",
      stdio: "inherit",
      shell: true,
    });
    if (pushedprod) {
      console.log("Pushed to production on sitekey " + sitekey);
    }
  }
}

async function remove(sitekeys) {
  console.log("Deleting local folders for sitekeys:", JSON.stringify(sitekeys), "Please wait...");
  for (counter in sitekeys) {
    let deleted = await helpertasks.deleteBranch(path + sitekeys[counter]);
    if (deleted) {
      console.log("Deleted " + sitekeys[counter] + " branch locally");
    }
  }
}

module.exports = {
  getSitekey,
  build,
  test,
  rebulidConfig,
  modernize,
  turnOff,
  deploy,
  remove,
};
