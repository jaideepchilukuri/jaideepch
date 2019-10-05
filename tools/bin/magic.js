#!/usr/bin/env node

const program = require("commander");
const inquirer = require("inquirer");
const magic = require("../scripts/magic");
const wrap = require("../scripts/other").wrap;

const scrollCommands = ["summon", "enchant", "conjure", "reanimate", "facelift", "purge", "trick", "vanquish"];
const scrollCommandDesc = {
  summon: "Check out existing config for sitekey(s)",
  enchant: "Build client code package for sitekey(s)",
  conjure: "Start localhost test for a sitekey",
  reanimate: "Rebuild config files and assets for sitekey(s)",
  facelift: "Move all desktop invites to modern for sitekey(s)",
  purge: "Stop all invites for sitekey(s)",
  trick: "Commit changes for a sitekey",
  vanquish: "Delete local folder for sitekey(s)",
};
const fcpcontainers = ["Development", "Staging", "Production", "All of the above", "None" /*, "Other"*/];
const wheretodeploy = [
  "Github and Development",
  "Github",
  "Development",
  "Staging",
  "Prouction",
  "All of the above",
  //"Other",
];

const scrollQuestion = {
  type: "list",
  name: "commands",
  message: "What are you trying to do, sorcerer?",
  choices: scrollCommands,
};
const sitekeyQuestion = {
  when: function(answers) {
    if (answers.commands == ("conjure" || "trick")) {
      return true;
    }
  },
  type: "input",
  name: "sitekey",
  message: "What sitekey do you want to do this for?",
};
const sitekeysQuestion = {
  when: function(answers) {
    if (answers.commands != ("conjure" || "trick")) {
      return true;
    }
  },
  type: "input",
  name: "sitekeys",
  message: "What sitekey(s) do you want to do this for? (Format: sitekey1 sitekey2 sitekey3 etc)",
};
const summonQuestion = {
  when: function(answers) {
    if (answers.commands == "summon") {
      return true;
    }
  },
  type: "list",
  name: "fcpcontainers",
  message: "What container(s) would you like to grab the currently deployed fcp configs for?",
  choices: fcpcontainers,
};
const summonContainers = {
  when: function(answers) {
    if (answers.fcpcontainers == "Other") {
      return true;
    }
  },
  type: "input",
  name: "fcpcontainers",
  message:
    "What other container(s) would you like to grab the currently deployed fcp configs for? (Format: container1 container2 container3 etc)",
};
const enchantQuestion = {
  when: function(answers) {
    if (answers.commands == "enchant") {
      return true;
    }
  },
  type: "input",
  name: "codeversion",
  message: "What code version would you like to build this package for? (Leave blank to not change)",
};
const trickQuestion = {
  when: function(answers) {
    if (answers.commands == "trick") {
      return true;
    }
  },
  type: "list",
  name: "deployto",
  message: "Where would you like to deploy this sitekey's config to?",
  choices: wheretodeploy,
};
const trickContainers = {
  when: function(answers) {
    if (answers.deployto == "Other") {
      return true;
    }
  },
  type: "input",
  name: "deployto",
  message:
    "What other fcp container(s) would you like to deploy this sitekey's config to? (Format: container1 container2 container3 etc)",
};

program
  .command("scroll")
  .alias("m")
  .description(
    "Also known as Bill Vargo's Unfurling Scroll. This will provide a list of everything you can do, automagically..."
  )
  .action(function() {
    for (command in scrollCommands) {
      console.log(scrollCommands[command] + " - " + scrollCommandDesc[scrollCommands[command]]);
    }
    inquirer
      .prompt([
        scrollQuestion,
        sitekeyQuestion,
        sitekeysQuestion,
        summonQuestion,
        //summonContainers,
        enchantQuestion,
        trickQuestion,
        //trickContainers,
      ])
      .then(function(answers) {
        if (answers.sitekey) {
          answers.sitekeys = [answers.sitekey];
        } else {
          answers.sitekeys = answers.sitekeys.split(" ");
        }
        if (answers.fcpcontainers == "All of the above") {
          answers.fcpcontainers = "Development Staging Production";
        }
        if (answers.fcpcontainers) {
          answers.fcpcontainers = answers.fcpcontainers.split(" ");
          let tempObj = {};
          for (container in answers.fcpcontainers) {
            switch (answers.fcpcontainers[container]) {
              case "Development":
                tempObj.development = true;
                break;
              case "Staging":
                tempObj.staging = true;
                break;
              case "Production":
                tempObj.production = true;
                break;
            }
          }
          answers.fcpcontainers = tempObj;
        }
        if (answers.deployto == "All of the above") {
          answers.deployto = "Github Development Staging Production";
        }
        if (answers.deployto == "Github and Development") {
          answers.deployto = "Github Development";
        }
        if (answers.deployto) {
          answers.deployto = answers.deployto.split(" ");
          let tempObj = {};
          for (container in answers.deployto) {
            switch (answers.deployto[container]) {
              case "Github":
                tempObj.github = true;
                break;
              case "Development":
                tempObj.development = true;
                break;
              case "Staging":
                tempObj.staging = true;
                break;
              case "Production":
                tempObj.production = true;
                break;
            }
          }
          answers.deployto = tempObj;
        }
        console.log(answers);
        switch (answers.commands) {
          case "summon":
            wrap(magic.getSitekey(answers.sitekeys, answers.fcpcontainers));
            break;
          case "enchant":
            wrap(magic.build(answers.sitekeys, answers.codeversion));
            break;
          case "conjure":
            wrap(magic.test(answers.sitekeys));
            break;
          case "reanimate":
            wrap(magic.rebulidConfig(answers.sitekeys));
            break;
          case "facelift":
            wrap(magic.modernize(answers.sitekeys));
            break;
          case "purge":
            wrap(magic.turnOff(answers.sitekeys));
            break;
          case "trick":
            wrap(magic.deploy(answers.sitekeys, answers.deployto));
            break;
          case "vanquish":
            wrap(magic.remove(answers.sitekeys));
            break;
          default:
            console.log(answers.commands);
        }
      });
  });

// older commands

/*program
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
*/
program.parse(process.argv);
