#!/usr/bin/env node

const program = require("commander");
const magic = require("../scripts/magic");
const wrap = require("../scripts/other").wrap;

const scrollCommands = [
	"summon",
	"enchant",
	"conjure",
	"mutate",
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
	mutate: "Set config equal to fcp config for sitekey(s)",
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
	{ name: "Production" },
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
const summonQuestionWithoutWhen = (({ when, ...others }) => ({ ...others }))(summonQuestion);
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
const enchantQuestionWithoutWhen = (({ when, ...others }) => ({ ...others }))(enchantQuestion);
const mutateQuestion = {
	when: function(answers) {
		if (answers.commands == "mutate") {
			return true;
		}
	},
	type: "list",
	name: "fcpcontainers",
	message: "What container would you like to set the config to?",
	choices: fcpcontainers,
};
const mutateQuestionWithoutWhen = (({ when, ...others }) => ({ ...others }))(mutateQuestion);
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
const trickQuestionWithoutWhen = (({ when, ...others }) => ({ ...others }))(trickQuestion);
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

const listQuestions = [
	scrollQuestion,
	sitekeyQuestion,
	sitekeysQuestion,
	summonQuestion,
	//summonContainers,
	enchantQuestion,
	mutateQuestion,
	trickQuestion,
	//trickContainers,
];

program
	.command("scroll [sitekeys...]")
	.alias("m")
	.description(
		"Also known as Bill Vargo's Unfurling Scroll. This will provide a list of everything you can do, automagically..."
	)
	.option(`-${scrollCommands[0].substring(0, 1)}, --${scrollCommands[0]}`, `${scrollCommandDesc[scrollCommands[0]]}`)
	.option(`-${scrollCommands[1].substring(0, 1)}, --${scrollCommands[1]}`, `${scrollCommandDesc[scrollCommands[1]]}`)
	.option(`-${scrollCommands[2].substring(0, 1)}, --${scrollCommands[2]}`, `${scrollCommandDesc[scrollCommands[2]]}`)
	.option(`-${scrollCommands[3].substring(0, 1)}, --${scrollCommands[3]}`, `${scrollCommandDesc[scrollCommands[3]]}`)
	.option(`-${scrollCommands[4].substring(0, 1)}, --${scrollCommands[4]}`, `${scrollCommandDesc[scrollCommands[4]]}`)
	.option(`-${scrollCommands[5].substring(0, 1)}, --${scrollCommands[5]}`, `${scrollCommandDesc[scrollCommands[5]]}`)
	.option(`-${scrollCommands[6].substring(0, 1)}, --${scrollCommands[6]}`, `${scrollCommandDesc[scrollCommands[6]]}`)
	.option(`-${scrollCommands[7].substring(0, 1)}, --${scrollCommands[7]}`, `${scrollCommandDesc[scrollCommands[7]]}`)
	.option(`-${scrollCommands[8].substring(0, 1)}, --${scrollCommands[8]}`, `${scrollCommandDesc[scrollCommands[8]]}`)
	.option(`-${scrollCommands[9].substring(0, 1)}, --${scrollCommands[9]}`, `${scrollCommandDesc[scrollCommands[9]]}`)
	.action(wrap(listCommands));

program.parse(process.argv);

async function listCommands(sitekeys, cmd) {
	let questions = listQuestions;
	let valsToPass = {};
	if (sitekeys && sitekeys != "") {
		valsToPass.sitekeys = "";
		for (sitekey in sitekeys) {
			valsToPass.sitekeys += sitekeys[sitekey] + " ";
		}
		valsToPass.sitekeys = valsToPass.sitekeys.slice(0, -1);
		questions.splice(1, 2);
	}
	if (
		cmd &&
		(cmd[scrollCommands[0]] ||
			cmd[scrollCommands[1]] ||
			cmd[scrollCommands[2]] ||
			cmd[scrollCommands[3]] ||
			cmd[scrollCommands[4]] ||
			cmd[scrollCommands[5]] ||
			cmd[scrollCommands[6]] ||
			cmd[scrollCommands[7]] ||
			cmd[scrollCommands[8]] ||
			cmd[scrollCommands[9]])
	) {
		questions = [];
		if (!valsToPass.sitekeys) {
			questions.push(sitekeysQuestion);
		}
		if (cmd.summon) {
			questions.push(summonQuestionWithoutWhen);
		}
		if (cmd.enchant) {
			questions.push(enchantQuestionWithoutWhen);
		}
		if (cmd.mutate) {
			questions.push(mutateQuestionWithoutWhen);
		}
		if (cmd.trick) {
			questions.push(trickQuestionWithoutWhen);
		}
		valsToPass.commands = "";
		for (option in scrollCommands) {
			if (cmd[scrollCommands[option]]) {
				valsToPass.commands += scrollCommands[option] + " ";
			}
		}
		valsToPass.commands = valsToPass.commands.slice(0, -1);
	}
	await magic.listCommands(questions, false, valsToPass);
}
