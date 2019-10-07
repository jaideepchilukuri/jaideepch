#!/usr/bin/env node

const program = require("commander");
const magic = require("../scripts/magic");
const wrap = require("../scripts/other").wrap;

const scrollCommands = [
  "summon",
  "enchant",
  "conjure",
  "transfigure",
  "reanimate",
  "facelift",
  "purge",
  "illusion",
  "trick",
  "vanquish",
];
const scrollCommandDesc = {
  summon: "Check out existing config for sitekey(s)",
  enchant: "Build client code package for sitekey(s)",
  conjure: "Start localhost test for a sitekey",
  transfigure: "Set config equal to fcp config for sitekey(s)",
  reanimate: "Rebuild config files and assets for sitekey(s)",
  facelift: "Move all desktop invites to modern for sitekey(s)",
  purge: "Stop all invites for sitekey(s)",
  illusion: "Create an on premise package for sitekey(s)",
  trick: "Commit changes for a sitekey",
  vanquish: "Delete local folder for sitekey(s)",
};
const fcpcontainers = ["Development", "Staging", "Production" /*, "Other"*/];
const wheretodeploy = [
  { name: "Github", checked: true },
  { name: "Development", checked: true },
  { name: "Staging" },
  { name: "Prouction" },
  //"Other",
];

const scrollQuestion = {
  type: "list",
  name: "commands",
  message: `${JSON.stringify(scrollCommandDesc)
    .replace(/",/g, `\n`)
    .replace("{", "")
    .replace("}", "")
    .replace(/"/g, "")
    .replace(/:/g, " - ")}\r\nWhat would you like to do, Mage?`,
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
  type: "checkbox",
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
  name: "fcpothercontainers",
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
const transfigureQuestion = {
  when: function(answers) {
    if (answers.commands == "transfigure") {
      return true;
    }
  },
  type: "list",
  name: "fcpcontainers",
  message: "What container would you like to set the config to?",
  choices: fcpcontainers,
};
const trickQuestion = {
  when: function(answers) {
    if (answers.commands == "trick") {
      return true;
    }
  },
  type: "checkbox",
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
  name: "deploytoother",
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
    wrap(
      magic.listCommands([
        scrollQuestion,
        sitekeyQuestion,
        sitekeysQuestion,
        summonQuestion,
        //summonContainers,
        enchantQuestion,
        transfigureQuestion,
        trickQuestion,
        //trickContainers,
      ])
    );
  });

program.parse(process.argv);
