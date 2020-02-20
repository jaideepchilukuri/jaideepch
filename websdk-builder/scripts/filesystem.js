const ejs = require("ejs"),
	unzip = require("unzip-stream"),
	rimraf = require("rimraf"),
	fs = require("fs-extra");

async function checkIfFileOrDirExists(path, consoleMsg) {
	if (fs.existsSync(path)) {
		if (consoleMsg) {
			console.log(consoleMsg);
		}
		return true;
	}
	return false;
}

async function makeDirIfMissing(path, consoleMsg) {
	if (consoleMsg) {
		console.log(consoleMsg);
	}
	let folders = path.split("/");
	path = folders[0];
	for (let counter = 1; counter < folders.length; counter++) {
		path += `/${folders[counter]}`;
		if (!fs.existsSync(path)) {
			fs.mkdirSync(path);
		}
	}
	return true;
}

async function deleteFileOrDirIfExists(path, consoleMsg) {
	if (fs.existsSync(path)) {
		if (consoleMsg) {
			console.log(consoleMsg);
		}
		fs.removeSync(path)
		return true;
	}
	return false;
}

async function copyFrom2ToIfFromExists(from, to, consoleMsg) {
	if (fs.existsSync(from)) {
		if (consoleMsg) {
			console.log(consoleMsg);
		}
		await deleteFileOrDirIfExists(to /*, "deleted a folder to copy " + from + " to " + to*/);
		fs.copySync(from,to);
		return true;
	}
	return false;
}

async function copyFrom2ToIfToMissing(from, to, consoleMsg) {
	if (!fs.existsSync(to)) {
		if (consoleMsg) {
			console.log(consoleMsg);
		}
		fs.copySync(from,to);
		return true;
	}
	return false;
}

async function readFileToStringIfExists(path, consoleMsg) {
	if (consoleMsg) {
		console.log(consoleMsg);
	}
	let string;
	if (fs.existsSync(path)) {
		string = fs.readFileSync(path, "utf8");
	}
	return string;
}

async function readFileToObjectIfExists(path, consoleMsg) {
	let string = await readFileToStringIfExists(path, consoleMsg);
	if (string) {
		return JSON.parse(string);
	}
	// console.log("Got an undefined string in readFileToObjectIfExists", path);
	return undefined;
}

async function readFileToReadStream(path) {
	return fs.createReadStream(path);
}

async function writeToFile(path, fileContents, consoleMsg) {
	if (consoleMsg) {
		console.log(consoleMsg);
	}
	if (typeof fileContents == "object") {
		fileContents = JSON.stringify(fileContents);
	}
	fs.writeFileSync(path, fileContents, function(err) {
		if (err) {
			return reject(err);
		}
	});
	return true;
}

async function writeZip(path, fileContents, consoleMsg) {
	if (consoleMsg) {
		console.log(consoleMsg);
	}
	fs.writeFileSync(path, fileContents, function(err) {
		if (err) {
			return reject(err);
		}
	});
	return true;
}

async function unzipAssets(path) {
	await makeDirIfMissing(`${path}/`);
	await fs
		.createReadStream(`${path}.zip`)
		.pipe(unzip.Parse())
		.on("entry", function(entry) {
			if (
				entry.path !== "trigger/" &&
				entry.path.substr(0, 8) === "trigger/" &&
				entry.path.substr(0, 18) !== "trigger/templates/"
			) {
				if (entry.type == "Directory") {
					makeDirIfMissing(`${path}/${entry.path}`);
				} else {
					entry.pipe(fs.createWriteStream(`${path}/${entry.path.substr(8)}`));
				}
			} else {
				entry.autodrain();
			}
		});
	let assetsLoc = path.split("/");
	assetsLoc = assetsLoc[assetsLoc.length - 2] + "/" + assetsLoc[assetsLoc.length - 1];
	console.log(assetsLoc);
}

async function buildFileContentsFromTemplateFile(filename, data, delimiter) {
	if (!delimiter) {
		delimiter = "%";
	}
	let string = await ejs.renderFile(filename, data, { delimiter: delimiter });
	//come back and revisit this - if there's something that replaces all of these instead of hardcoding a list it would be better
	string = string
		.replace(/&lt;/g, "<")
		.replace(/&gt;/g, ">")
		.replace(/&#34;/g, '\\"');
	// console.log(string);
	return string;
}

module.exports = {
	checkIfFileOrDirExists,
	makeDirIfMissing,
	deleteFileOrDirIfExists,
	copyFrom2ToIfFromExists,
	copyFrom2ToIfToMissing,
	readFileToStringIfExists,
	readFileToObjectIfExists,
	readFileToReadStream,
	writeToFile,
	writeZip,
	unzipAssets,
	buildFileContentsFromTemplateFile,
	rimraf,
};
