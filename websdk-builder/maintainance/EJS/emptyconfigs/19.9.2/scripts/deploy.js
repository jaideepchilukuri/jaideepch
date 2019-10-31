/* eslint-env node */
// ES6 methods are safe to use in Node>=10
/* eslint-disable es5/no-es6-methods, es5/no-es6-static-methods, es5/no-for-of, no-await-in-loop */

const pjson = require("../package.json");
const semver = require("semver");
const chalk = require("chalk");
const { ask } = require("./ask");
const fs = require("fs").promises;
const path = require("path");
const git = require("simple-git/promise")(path.resolve(`${__dirname}/..`));
const {
  optionallyPromptForCredentials,
  pushCode,
  pushDefaultConfig,
  environments,
  environmentUrls,
} = require("./FCP");
const { promisify } = require("util");
const { buildForDeploy, DIST } = require("./build");
const { getGlobalConfig } = require("./SDKConfigs");

const ENVS = {
  // dev build to dev only
  dev: { prerelease: "any", devonly: true, latest: true },

  // nightly build to dev/qa/qa2/stg but marked invalid so not in suite
  nightly: { prerelease: "nightly", gitOrphan: true, silent: true, latest: "invalid" },

  // QA build sent to dev/qa/qa2/stg but not latest so won't mess w/ replay
  qa: { prerelease: "qa", latest: true },

  // RC build sent to dev/qa/qa2/stg
  rc: { prerelease: "rc", depl: true, latest: true },

  // prerelease RC build sent to dev/qa/qa2/stg/PROD but marked invalid
  pre: { prerelease: "rc", depl: true, latest: "invalid" },

  // prod build sent to all envs, fully latest
  prod: { prod: true, depl: true, latest: true },
};

/**
 * Deploy code to FCP
 */
async function deploy(env) {
  try {
    if (!ENVS[env]) {
      console.error(chalk.red(`Unknown env ${env}`));
      return;
    }

    console.log(chalk.magenta(`Deploying ${env}...`));

    console.log("Checking git status...");
    const depl = await checkGitStatus(ENVS[env]);

    console.log("Bumping version...");
    const ver = await bumpVersion(ENVS[env]);

    await tagNewVersion(ENVS[env], depl, ver);
    await pushToFCP(ENVS[env], depl, ver);
  } catch (e) {
    console.error(chalk.red(e));
  }
}

async function checkGitStatus(env) {
  const gitStatus = await git.status();
  const branch = gitStatus.current;
  if (env.depl) {
    if (!branch.startsWith("DEPL-")) {
      console.error(chalk.red("Must be on DEPL branch to deploy!"));
      // eslint-disable-next-line no-process-exit
      process.exit(1);
    }
  } else if (branch !== "core" && branch !== "develop" && !branch.startsWith("DEPL-")) {
    console.error(chalk.red("Must be on core, develop or DEPL to deploy!"));
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }

  if (gitStatus.files.length) {
    console.error(chalk.red("Can't deploy with uncomitted changes!"));
    // eslint-disable-next-line no-process-exit
    process.exit(1);
  }

  await git.pull("origin", branch);

  return branch;
}

async function bumpVersion(env) {
  const nextver = await determineNextVersion(env);
  await updatePackageJson(nextver);

  return nextver;
}

async function pushToFCP(env, depl, ver) {
  const goahead =
    env.silent ||
    (await ask(`Push to ${chalk.cyan("FCP")} ${chalk.yellow(depl)} ${chalk.green(ver)}?`, true));
  if (!goahead) {
    return;
  }

  console.log(`Pushing to ${chalk.cyan("FCP")} ${chalk.yellow(depl)} ${chalk.green(ver)}...`);

  // Grab the password here
  const rs = await grabFCPPassword(env);

  await buildAndPushToDev(rs, ver);

  if (env.devonly) return slackMessage(ver, "dev");

  await buildAndPushToTestEnvs(rs, ver);

  if (!env.prod) return slackMessage(ver, "dev/qa/qa2/stg");

  await pushToProd(env, rs, ver, depl);

  slackMessage(ver, "dev/qa/qa2/stg/*prod*");
}

async function grabFCPPassword(env) {
  const rs = await new Promise(resolve => {
    optionallyPromptForCredentials(null, { disableEnv: true }, resolve);
  });
  rs.notes = "Pushing ${ver} (${depl})";
  rs.latest = env.latest;
  return rs;
}

async function buildAndPushToDev(rs, ver) {
  console.log(`\n\nBuilding ${chalk.yellow("development")} version...`);
  // build debug code
  await buildForDeploy(false, ver);

  // push to dev
  console.log(`Pushing to ${chalk.yellow("dev")}...`);
  // pushCode(dist, version, dev, testEnvs, isProd, rs, cb)
  await promisify(pushCode)(DIST, ver, true, false, false, rs);
}

async function buildAndPushToTestEnvs(rs, ver) {
  console.log(`\n\nBuilding ${chalk.green("production")} version...`);
  // build prod code
  await buildForDeploy(true, ver);
  console.log(`Pushing to ${chalk.green("qa/qa2/stg")}...`);

  // push to testenvs
  // pushCode(dist, version, dev, testEnvs, isProd, rs, cb)
  await promisify(pushCode)(DIST, ver, false, true, true, rs);

  // Not sure if this is necessary
  for (const environ of ["qa", "qa2", "stg"]) {
    console.log(`Pushing default config to ${chalk.green(environ)}...`);
    rs.env = environments.findIndex(e => e === environ);
    rs.environment = environmentUrls[environ];
    await promisify(pushDefaultConfig)(ver, getGlobalConfig, rs);
  }
}

async function pushToProd(env, rs, ver, depl) {
  const greenlight =
    env.silent ||
    (await ask(
      `Push to ${chalk.red("PROD")} ${chalk.cyan("FCP")} ${chalk.yellow(depl)} ${chalk.green(
        ver
      )}?`,
      true
    ));
  if (!greenlight) {
    return;
  }

  rs.env = environments.findIndex(e => e === "prod");
  rs.environment = environmentUrls.prod;

  // pushCode(dist, version, dev, testEnvs, isProd, rs, cb)
  await promisify(pushCode)(DIST, ver, false, false, true, rs);
  console.log(`Pushing default config to ${chalk.red("prod")}...`);

  // optionally push default config
  await promisify(pushDefaultConfig)(ver, getGlobalConfig, rs);
}

async function determineNextVersion(env) {
  const cur = pjson.version;
  const pre = semver.prerelease(cur);
  const rootver = `${semver.major(cur)}.${semver.minor(cur)}.${semver.patch(cur)}`;
  let wantedpre = env.prerelease;

  if (wantedpre === "any") {
    wantedpre = pre[0];
  }

  let nextver;

  if (pre[0] !== wantedpre) {
    if (pre[0] === "rc" && wantedpre === "qa") {
      console.error(chalk.red(`Not sure how to bump an RC back to QA`));
      // eslint-disable-next-line no-process-exit
      process.exit(1);
    }
    if (wantedpre === "nightly") {
      nextver = `${rootver}-${wantedpre}`;
    } else if (wantedpre) {
      nextver = `${rootver}-${wantedpre}.1`;
    } else {
      nextver = rootver;
    }
  } else {
    nextver = semver.inc(cur, "prerelease");
  }

  if (!env.silent) {
    console.log(`Current version is ${chalk.green(cur)}...`);
    if (!(await ask(`Is the next version ${chalk.green(nextver)}?`, true))) {
      if (await ask(`Do you want to keep version ${chalk.green(cur)}?`, true)) {
        nextver = cur;
      } else {
        console.error(chalk.red("Please fix the package.json version manually."));
        // eslint-disable-next-line no-process-exit
        process.exit(1);
      }
    }
  }

  return nextver;
}

async function tagNewVersion(env, depl, ver) {
  const nightlyBranch = `nightly-${Date.now()}`;

  if (env.gitOrphan) {
    // in nightlies we don't want the version bump in the main branch
    console.log("  ↳ Forking branch", nightlyBranch);
    await git.checkoutBranch(nightlyBranch, depl);
  }

  if (ver !== pjson.version) {
    await git.add("package.json");
    await git.commit(`Bump version to ${ver}`, "package.json");

    if (!env.gitOrphan) {
      // push the version bump if it's not orphaned
      await git.push("origin", depl);
    }
  }

  const goahead =
    env.silent ||
    (await ask(
      `Push to ${chalk.magenta("github")} ${chalk.yellow(depl)} ${chalk.green(ver)}?`,
      true
    ));
  if (!goahead) {
    return;
  }

  console.log(
    `  ↳ Pushing to ${chalk.magenta("github")} ${chalk.yellow(depl)} ${chalk.green(ver)}...`
  );

  const tags = await git.tags();
  const tagExists = tags.all.includes(ver);
  if (tagExists) {
    const overwrite =
      env.silent ||
      (await ask(`${chalk.red("Overwrite")} existing tag ${chalk.yellow(ver)}?`, true));
    if (overwrite) {
      console.log(`  ↳ ${chalk.red("Overwriting")} existing tag ${chalk.yellow(ver)}...`);
      try {
        console.log(`  ↳ deleting local tag`);
        await git.raw(["tag", "-d", ver]);
        console.log(`  ↳ deleting remote tag`);
        await git.raw(["push", "--no-verify", "origin", `:refs/tags/${ver}`]);
      } catch (e) {
        console.error(chalk.red(e));
      }
    } else {
      console.error(chalk.red("Not creating a new tag, as it exists"));
      return;
    }
  }

  console.log(`  ↳ Creating tag ${ver}...`);
  await git.addAnnotatedTag(ver, depl);

  console.log(`  ↳ Pushing ${ver} to github...`);
  await git.push(["--no-verify", "origin", ver]);

  if (env.gitOrphan) {
    // switch back to main branch & delete the nightly one
    console.log("  ↳ Returning to branch", depl);
    await git.checkout(depl);
    console.log("  ↳ Deleting temp branch", nightlyBranch);
    await git.branch(["-D", nightlyBranch]);
  }
}

async function updatePackageJson(nextver) {
  // Update the package.json
  const pkgpath = path.resolve(`${__dirname}/../package.json`);
  let pkgtext = (await fs.readFile(pkgpath)).toString("utf8");
  pkgtext = pkgtext.replace(/"version":\s*".*",/, `"version": "${nextver}",`);
  await fs.writeFile(pkgpath, pkgtext);
}

function slackMessage(ver, envs) {
  const msg = `@here :label: ${ver} is pushed to ${envs} :tada:`;
  console.log(`Slack Message: ${chalk.cyan(msg)}`);
}

module.exports = { deploy };
