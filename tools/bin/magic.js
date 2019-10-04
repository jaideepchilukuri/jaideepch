#!/usr/bin/env node

const program = require("commander");
const magic = require("../scripts/magic");
const wrap = require("../scripts/other").wrap;

program
  .command("summon [sitekeys...]")
  .alias("s")
  .description("Check out existing config for sitekey(s)")
  .option("-d --development", "Get custom config and assets from development")
  .option("-s --staging", "Get custom config and assets from staging")
  .option("-p --production", "Get custom config and assets from production")
  .action(wrap(magic.getSitekey));

program
  .command("enchant [sitekeys...]")
  .alias("e")
  .description("Build client code package for sitekey(s)")
  .option("-u --upgrade", "Upgrade sitekey(s) to a version before building")
  .option("-c --conjure", "Start localhost test (for the first sitekey only)")
  .action(wrap(magic.build));

program
  .command("conjure <sitekey>")
  .alias("c")
  .description("Start localhost test")
  .action(wrap(magic.test));

program
  .command("reanimate [sitekeys...]")
  .alias("r")
  .description("Rebuild config files and assets in CC package after making changes to config.json or modifying assets")
  .action(wrap(magic.rebulidConfig));

program
  .command("facelift [sitekeys...]")
  .alias("f")
  .description("Move all desktop invites to modern invite")
  .action(wrap(magic.modernize));

program
  .command("purge [sitekeys...]")
  .alias("w")
  .description("Turn the sp to -1 on all definitions for both regular and mouseoff")
  .action(wrap(magic.turnOff));

program
  .command("trick <sitekey>")
  .alias("t")
  .description("Commit/push changes somewhere (but only if you use flags)")
  .option("-d --pushdev", "Push changes to development container in fcp, commit and push changes back to github repo")
  .option("-s --pushstg", "Push changes to staging container in fcp")
  .option("-p --pushprd", "Push changes to production container in fcp")
  .action(wrap(magic.deploy));

program
  .command("vanquish [sitekeys...]")
  .alias("v")
  .description("Delete branch for sitekey(s)")
  .action(wrap(magic.remove));

program.parse(process.argv);
