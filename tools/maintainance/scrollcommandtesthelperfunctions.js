const fcpvals = require("../scripts/FCPvals");
const filesystem = require("../scripts/filesystem");
const other = require("../scripts/other");
const magic = require("../scripts/magic");

const path =
	process.cwd().substr(process.cwd().length - 6, 6) == "\\tools" || "/tools" 
		? `${process.cwd()}/maintainance`
		: `${process.cwd()}/tools/maintainance`;

async function runTheScrollCommand(testvals) {
	await magic.listCommands([], true, testvals);
}

async function checkConfigDotJson(sitekey, container) {
	let expectedLocation = `${path}/${sitekey}.json`;
	let createdLocation = `${path}/../clientconfigs/${sitekey}/config.json`;
	let compareMessage = `${sitekey} config.json`;
	if (container && container != "Github") {
		container = container.toLowerCase();
		expectedLocation = `${path}/FCP/${sitekey}/${container}/config.json`;
		createdLocation = `${path}/../clientconfigs/${sitekey}/_FCP/${container}/config.json`;
		compareMessage = `${sitekey} ${container} config.json`;
	}
	let matching = await filesystem.checkIfFileOrDirExists(createdLocation);
	if (matching) {
		let expected = await filesystem.readFileToStringIfExists(expectedLocation);
		expected = eval("expected = " + expected);
		// console.log("expected:", expected);
		let created = await filesystem.readFileToStringIfExists(createdLocation);
		created = eval("created = " + created);
		// console.log("created:", created);
		matching = await other.stringifyCompare(expected, created, compareMessage);
	}
	return matching;
}

async function compareConfigAgainstContainer(sitekey, container) {
	let expected = await filesystem.readFileToStringIfExists(
		`${path}/../clientconfigs/${sitekey}/_FCP/${container}/config.json`
	);
	expected = eval("expected = " + expected);
	let created = await filesystem.readFileToStringIfExists(`${path}/../clientconfigs/${sitekey}/config.json`);
	created = eval("created = " + created);
	let matching = await other.stringifyCompare(expected, created, `${sitekey} ${container} config.json`);
	return matching;
}

async function checkAssets(filename, sitekey, container) {
	let assetLocation = `${path}/../clientconfigs/${sitekey}/assets/${filename}`;
	if (container && container != "Github") {
		container = container.toLowerCase();
		assetLocation = `${path}/../clientconfigs/${sitekey}/_FCP/${container}/assets/${filename}`;
	}
	let matching = await filesystem.checkIfFileOrDirExists(assetLocation);
	return matching;
}

async function compareAssetsAgainstContainer(filename, sitekey, container) {
	let matching = await filesystem.checkIfFileOrDirExists(`${path}/../clientconfigs/${sitekey}/assets/${filename}`);
	return matching;
}

async function readConfigIntoObject(sitekey) {
	return await filesystem.readFileToObjectIfExists(`${path}/../clientconfigs/${sitekey}/config.json`);
}

async function checkIfCodeVersionValid(codeVersion) {
	return await filesystem.checkIfFileOrDirExists(`${path}/../EJS/${codeVersion}`);
}

async function checkIfCCFolderExists(sitekey) {
	return await filesystem.checkIfFileOrDirExists(`${path}/../clientconfigs/${sitekey}/CC/`);
}

async function checkCCAssets(filename, sitekey) {
	return await filesystem.checkIfFileOrDirExists(
		`${path}/../clientconfigs/${sitekey}/CC/clientconfig/productconfig/trigger/assets/${filename}`
	);
}

async function checkCCConfigFile(filename, sitekey) {
	return await filesystem.checkIfFileOrDirExists(`${path}/../clientconfigs/${sitekey}/CC/clientconfig/${filename}`);
}

async function checkNodeModules(sitekey) {
	return await filesystem.checkIfFileOrDirExists(`${path}/../clientconfigs/${sitekey}/CC/node_modules/`);
}

async function checkOnPrem(sitekey) {
	return await filesystem.checkIfFileOrDirExists(`${path}/../clientconfigs/${sitekey}/CC/dist/${sitekey}_selfhost.zip`);
}

async function checkIfSitekeyFolderExists(sitekey) {
	return await filesystem.checkIfFileOrDirExists(`${path}/../clientconfigs/${sitekey}/`);
}

async function returnLegacyDefaults() {
	return await fcpvals.legacyDesktopDefaults;
}

module.exports = {
	runTheScrollCommand,
	checkConfigDotJson,
	compareConfigAgainstContainer,
	checkAssets,
	compareAssetsAgainstContainer,
	readConfigIntoObject,
	checkIfCodeVersionValid,
	checkIfCCFolderExists,
	checkCCAssets,
	checkCCConfigFile,
	checkNodeModules,
	checkOnPrem,
	checkIfSitekeyFolderExists,
	returnLegacyDefaults,
};
