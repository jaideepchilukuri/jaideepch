const helpertasks = require("./helpertasks"),
	spotcheck = require("./spotcheck"),
	filesystem = require("./filesystem"),
	fcp = require("./FCPvals"),
	other = require("./other");
const loginFile = require("./FCPvals").loginFile;

const path =
	process.cwd().substr(process.cwd().length - 15, 15) == "\\websdk-builder" // "/websdk-builder" doesn't work, tried it, so I hope this doesn't cause an error on mac
		? `${process.cwd()}/clientconfigs/`
		: `${process.cwd()}/websdk-builder/clientconfigs/`;

async function listCommands(questions, testing, passedVals) {
	let answers;
	if (testing) {
		answers = passedVals;
	} else {
		answers = await other.askQuestion(questions);
		if (passedVals.sitekeys == "") {
			delete passedVals.sitekeys;
		}
		for (val in passedVals) {
			answers[val] = passedVals[val];
		}
	}
	if (answers.sitekey) {
		answers.sitekeys = [answers.sitekey];
	} else {
		answers.sitekeys = answers.sitekeys.split(" ");
	}
	//if (answers.fcpcontainers[answers.fcpcontainers.length-1] == "Other" {
	//  answers.fcpothercontainers = answers.fcpothercontainers.split(" ");
	//  answers.fcpcontainers.pop();
	//  answers.fcpcontainers = answers.fcpcontainers.concat(answers.fcpothercontainers));
	//}
	//answers.deploytoother same thing
	answers.commands = answers.commands.split(" ");
	console.log("Going to run commands:", JSON.stringify(answers.commands));
	for (command in answers.commands) {
		switch (answers.commands[command]) {
			case "summon":
				await getSitekey(answers.sitekeys, answers.fcpcontainers);
				break;
			case "enchant":
				await build(answers.sitekeys, answers.codeversion, answers.localhost);
				break;
			case "conjure":
				await test(answers.sitekeys);
				break;
			case "mutate":
				await helpertasks.copyCustom(path, answers.sitekeys, answers.fcpcontainers);
				break;
			case "reanimate":
				await rebulidConfig(answers.sitekeys);
				break;
			case "facelift":
				await modernize(answers.sitekeys);
				break;
			case "purge":
				await turnOff(answers.sitekeys);
				break;
			case "illusion":
				await onPrem(answers.sitekeys);
				break;
			case "trick":
				await deploy(answers.sitekeys, answers.deployto);
				break;
			case "vanquish":
				await remove(answers.sitekeys);
				break;
			default:
				console.log(answers.commands[command] + " isn't a scroll command we have logic written to handle");
		}
	}
}

async function getSitekey(sitekeys, containers) {
	console.log("Going to check out sitekeys:", JSON.stringify(sitekeys));
	for (counter in sitekeys) {
		await helpertasks.skCopy(path + sitekeys[counter]);
		for (container in containers) {
			await helpertasks.getCustom(path, sitekeys[counter], containers[container].toLowerCase());
		}
	}
}

async function build(sitekeys, codeversion, localhost) {
	console.log("Building packages for sitekeys:", JSON.stringify(sitekeys), "Please wait...");
	if (sitekeys.length > 0) {
		for (counter in sitekeys) {
			await spotcheck.checkCustomerKey(path + sitekeys[counter] + `/config.json`);
			if (codeversion) {
				console.log(`Rebuilding for version ${codeversion}...`);
				await helpertasks.upgradeChecks(path + sitekeys[counter]);
				await helpertasks.updateCodeVersion(path + sitekeys[counter], codeversion);
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
			await helpertasks.installNPM(path + sitekeys[counter]);
			console.log("Done building client code package");
		}
		if (localhost) {
			await test(sitekey[0]);
		}
	}
}

async function rebulidConfig(sitekeys, codeversion) {
	console.log("Rebuiliding config files for sitekeys:", JSON.stringify(sitekeys), "Please wait...");
	for (counter in sitekeys) {
		packagejson = await filesystem.readFileToObjectIfExists(path + sitekeys[counter] + "/CC/package.json");
		config = await filesystem.readFileToObjectIfExists(path + sitekeys[counter] + "/config.json");
		if (
			packagejson &&
			packagejson.version &&
			config &&
			config.global &&
			config.global.codeVer &&
			packagejson.version == config.global.codeVer &&
			(!codeversion || codeversion == config.global.codeVer)
		) {
			await helpertasks.assetsCopy(path + sitekeys[counter]);
			await helpertasks.configRebuild(path + sitekeys[counter]);
		} else {
			console.log("Code version is not built! Building client code package from scratch");
			await build([sitekeys[counter]], codeversion);
		}
	}
}

async function onPrem(sitekeys) {
	for (counter in sitekeys) {
		await other.spawnProcess("gulp", ["get_self_hosted"], {
			cwd: path + sitekeys[counter] + "/CC/",
			stdio: "inherit",
			shell: true,
		});
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
	/*should add option to pass in hex codes for colors and use those when rebuilding*/
	console.log("Migrating to modern invite on desktop for sitekeys:", JSON.stringify(sitekeys), "Please wait...");
	for (counter in sitekeys) {
		let modernized = await helpertasks.updateToModernInvite(path + sitekeys[counter]);
		if (modernized) {
			await other.spawnProcess("npx", [`prettier --write config.json`], {
				cwd: path + sitekeys[counter],
				stdio: "inherit",
				shell: true,
			});
			if (await filesystem.checkIfFileOrDirExists(path + sitekeys[counter] + "/CC")) {
				await helpertasks.configRebuild(path + sitekeys[counter]);
			}
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
			await helpertasks.configRebuild(path + sitekeys[counter]);
			console.log("Turned all sp to -1 for sitekey " + sitekeys[counter]);
		}
	}
}

async function deploy(sitekey, wheretopush) {
	if (wheretopush.length == 0) {
		console.log(
			"Now you see me, now you don't... (I did nothing, please try again and choose an option if you want something done)"
		);
	} else if ((await filesystem.checkIfFileOrDirExists(path + sitekey + "/CC")) == false) {
		console.log("Looks like you haven't built a client code template for this sitekey yet...");
		await build(sitekey);
	}
	let commitmessage;
	for (place in wheretopush) {
		if (wheretopush[place] == "Github") {
			commitmessage = await other.askQuestion([
				{ type: "input", name: "commitmessage", message: "What changes are you committing?" },
			]);
			commitmessage = commitmessage.commitmessage;
			commitmessage = await helpertasks.commitAndPushToGithub(path + sitekey, loginFile, commitmessage);
			console.log("finished github", commitmessage);
		} else if (wheretopush[place] == "Production") {
			await other.returnFCPCredentials(loginFile, commitmessage);
			let pushedprod = await other.spawnProcess("gulp", ["push_prod"], {
				cwd: path + sitekey + "/CC/",
				stdio: "inherit",
				shell: true,
			});
			await other.clearFCPCredentials(loginFile);
			if (pushedprod) {
				console.log("Pushed to production on sitekey " + sitekey);
			}
		} else if (wheretopush[place] == "Staging") {
			await other.returnFCPCredentials(loginFile, commitmessage);
			let pushedstg = await other.spawnProcess("gulp", ["push_stg"], {
				cwd: path + sitekey + "/CC/",
				stdio: "inherit",
				shell: true,
			});
			await other.clearFCPCredentials(loginFile);
			if (pushedstg) {
				console.log("Pushed to staging on sitekey " + sitekey);
			}
		} else {
			console.log("starting fcp dev", commitmessage);
			let unpw = await other.returnFCPCredentials(loginFile, commitmessage);
			let containerexists = await other.httpRequest(
				"GET",
				`https://fcp.foresee.com/sites/${sitekey}/containers/${wheretopush[place]}`,
				{
					headers: { authorization: fcp.fcpROCreds },
				}
			);
			if (containerexists.statusCode == 404) {
				//try to create the container because it probably didn't exist - should also check that message == "Container not found" but it's being difficult letting me see the body so that's for later
				let createdcontainer = await other.httpRequest(
					"POST",
					`https://${unpw}@fcp.foresee.com/sites/${sitekey}/containers`,
					{
						json: { name: wheretopush[place].toLowerCase(), notes: "Creating a new container" },
					}
				);
				console.log(
					`Created new container ${wheretopush[place]}? If it's a 200 you did...`,
					createdcontainer.statusCode
				);
			}
			let pusheddevconfig;
			if (wheretopush[place] == "Development") {
				pusheddevconfig = await helpertasks.pushCxSuiteConfigsToDevContainer(path + sitekey, loginFile);
				await other.spawnProcess("npx", [`prettier --write config.json`], {
					cwd: path + sitekey,
					stdio: "inherit",
					shell: true,
				});
			}
			let pusheddev = await other.spawnProcess("gulp", ["push_products"], {
				cwd: path + sitekey + "/CC/",
				stdio: "inherit",
				shell: true,
			});
			await other.clearFCPCredentials(loginFile);
			if (pusheddevconfig && pusheddev) {
				console.log("Pushed to development on sitekey " + sitekey);
			} else if (pusheddev) {
				console.log("Pushed to " + wheretopush[place] + " on sitekey " + sitekey);
			}
		}
	}
}

async function remove(sitekeys, quiet) {
	if (!quiet) {
		console.log("Deleting local folders for sitekeys:", JSON.stringify(sitekeys), "Please wait...");
	}
	for (counter in sitekeys) {
		let deleted = await helpertasks.deleteBranch(path + sitekeys[counter]);
		if (deleted && !quiet) {
			console.log("Deleted " + sitekeys[counter] + " branch locally");
		}
	}
}

module.exports = {
	listCommands,
	getSitekey,
	build,
	test,
	rebulidConfig,
	modernize,
	turnOff,
	onPrem,
	deploy,
	remove,
};
