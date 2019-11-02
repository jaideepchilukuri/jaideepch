const spawn = require("child_process").spawn,
	simplegit = require("simple-git/promise")(),
	syncrequest = require("sync-request"),
	request = require("request"),
	inquirer = require("inquirer"),
	atob = require("atob"),
	btoa = require("btoa");
const filesystem = require("./filesystem");
const loginFile = require("./FCPvals").loginFile;

function wrap(fn) {
	return function(...args) {
		return fn(...args).catch(err => {
			console.error(err);
			process.exit(1);
			return null;
		});
	};
}

async function spawnProcess(command, args, options) {
	if (!options) {
		options = { cwd: process.cwd(), stdio: "inherit", shell: true };
	}
	// *** Return the promise
	return new Promise(function(resolve, reject) {
		const child = spawn(command, args, options);
		child.on("exit", function(code) {
			return resolve(code);
		});
		child.on("error", function(err) {
			return reject(err);
		});
	});
}

async function returnGithubCredentials(loginFile) {
	let madeChangesToLoginFile = false;
	let savedLogins = await filesystem.readFileToObjectIfExists(loginFile);
	if (savedLogins == undefined) {
		savedLogins = {};
		madeChangesToLoginFile = true;
	}
	let un = savedLogins.GH_USERNAME;
	let pw = savedLogins.GH_PASSWORD;
	if (pw) {
		pw = await aTob(pw);
	}
	let unpw = {};
	if (!un) {
		madeChangesToLoginFile = true;
		unpw = await askQuestion([
			{
				type: "input",
				name: "un",
				message: "What is your username for github?",
				default: function() {
					if (un) {
						return un;
					}
					return;
				},
			},
		]);
		un = unpw.un;
		savedLogins.GH_USERNAME = un;
	}
	if (!pw) {
		madeChangesToLoginFile = true;
		unpw = await askQuestion([
			{
				type: "password",
				name: "pw",
				message: "What is your password for github?",
				mask: "*",
				default: function() {
					if (pw) {
						return pw;
					}
					return;
				},
			},
		]);
		pw = unpw.pw;
		savedLogins.GH_PASSWORD = await bToa(pw);
	}
	if (madeChangesToLoginFile) {
		await filesystem.writeToFile(loginFile, savedLogins);
		await spawnProcess("npx", [`prettier --write env.json`], {
			cwd: loginFile.substring(0, loginFile.length - "env.json".length),
			stdio: "inherit",
			shell: true,
		});
	}
	return un + ":" + pw;
}

async function doAGit(args /*errLogic*/) {
	let argString = JSON.stringify(args);
	if (argString.includes("https://github.com") && args[0] != "clone" && args[0] != "ls-remote") {
		// using this as the search because so far only using the url when getting errors because we need a un/pw to get access
		let unpw = await returnGithubCredentials(loginFile);
		for (let counter = 0; counter < args.length; counter++) {
			args[counter] = args[counter].replace("https://github.com", `https://${unpw}@github.com`);
		}
	}
	/*if (errLogic) {
    return simplegit.raw(args, function(err, result) {
      if (err) errLogic;
      else {
        cb();
      }
    });
  }*/
	return await simplegit.raw(args);
}

async function httpRequest(type, url, options) {
	if (options) {
		return await syncrequest(type, url, options);
	}
	return await syncrequest(type, url);
}

async function multipartPost(url, notes, fileLoc) {
	let formdata = { notes: notes, config: await filesystem.readFileToReadStream(fileLoc) };
	request.post(
		{
			url: url,
			formData: formdata,
		},
		function optionalCallback(err, httpResponse, body) {
			if (err) {
				return console.error("upload failed:", err);
			}
			console.log("Contact successful... Server responded with:", body);
		}
	);
	await filesystem.deleteFileOrDirIfExists(fileLoc);
	return true;
}

async function askQuestion(questions) {
	return inquirer.prompt(questions);
}

async function aTob(string) {
	return atob(string);
}

async function bToa(string) {
	return btoa(string);
}

async function stringifyCompare(firstThing, secondThing, whatsNotMatching) {
	firstThing = JSON.stringify(firstThing);
	// console.log("firstThing:", firstThing);
	secondThing = JSON.stringify(secondThing);
	// console.log("secondThing:", secondThing);
	if (firstThing.length != secondThing.length) {
		console.log("Strings not same length:", firstThing.length, secondThing.length);
	}
	let matching = true;
	let temp = 0;
	while (matching && temp < firstThing.length) {
		if (firstThing.charAt(temp) != secondThing.charAt(temp)) {
			console.log(
				whatsNotMatching + " not matching at:",
				temp,
				firstThing.substring(temp - 10, temp + 10),
				secondThing.substring(temp - 10, temp + 10)
			);
			matching = false;
		} else {
			temp++;
		}
	}
	return matching;
}

module.exports = {
	wrap,
	spawnProcess,
	returnGithubCredentials,
	doAGit,
	httpRequest,
	multipartPost,
	askQuestion,
	aTob,
	bToa,
	stringifyCompare,
};
