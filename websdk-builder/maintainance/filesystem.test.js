const rimraf = require("rimraf");
const fs = require("fs");
const filesystem = require("../scripts/filesystem");

const path =
	process.cwd().substr(process.cwd().length - 15, 15) == "\\websdk-builder" // "/websdk-builder" doesn't work, tried it, so I hope this doesn't cause an error on mac
		? `${process.cwd()}/tests`
		: `${process.cwd()}/websdk-builder/tests`;

test("Check non-existant file", async () => {
	let testLoc = `${path}/emptycheck0.js`;
	rimraf.sync(testLoc);
	let expected = !(await filesystem.checkIfFileOrDirExists(testLoc));
	expect(expected).toBe(true);
});

test("Check existant file", async () => {
	let testLoc = `${path}/emptycheck1.js`;
	rimraf.sync(testLoc);
	fs.writeFileSync(testLoc, "{}");
	let expected = await filesystem.checkIfFileOrDirExists(testLoc);
	rimraf.sync(testLoc);
	expect(expected).toBe(true);
});

test("Check non-existant folder", async () => {
	let testLoc = `${path}/empty0`;
	rimraf.sync(testLoc);
	let expected = !(await filesystem.checkIfFileOrDirExists(testLoc));
	expect(expected).toBe(true);
});

test("Check existant folder", async () => {
	let testLoc = `${path}/empty1`;
	if (!fs.existsSync(testLoc)) {
		fs.mkdirSync(testLoc);
	}
	let expected = await filesystem.checkIfFileOrDirExists(testLoc);
	expect(expected).toBe(true);
});

test("Create non-existant folder", async () => {
	let testLoc = `${path}/empty2`;
	rimraf.sync(testLoc);
	let returnedValue = await filesystem.makeDirIfMissing(testLoc);
	let didJob = fs.existsSync(testLoc);
	rimraf.sync(testLoc);
	let expected = false;
	if (returnedValue && didJob) {
		expected = true;
	}
	expect(expected).toBe(true);
});

test("Create existant folder", async () => {
	let testLoc = `${path}/empty3`;
	if (!fs.existsSync(testLoc)) {
		fs.mkdirSync(testLoc);
	}
	let returnedValue = await filesystem.makeDirIfMissing(testLoc);
	let didJob = fs.existsSync(testLoc);
	let expected = false;
	if (returnedValue && didJob) {
		expected = true;
	}
	expect(expected).toBe(true);
});

test("Delete non-existant file", async () => {
	let testLoc = `${path}/emptydelete0.js`;
	rimraf.sync(testLoc);
	let returnedValue = await filesystem.deleteFileOrDirIfExists(testLoc);
	let didJob = !fs.existsSync(testLoc);
	let expected = false;
	if (!returnedValue && didJob) {
		expected = true;
	}
	expect(expected).toBe(true);
});

test("Delete existant file", async () => {
	let testLoc = `${path}/emptydelete1.js`;
	fs.writeFileSync(testLoc, "{}");
	let returnedValue = await filesystem.deleteFileOrDirIfExists(testLoc);
	let didJob = !fs.existsSync(testLoc);
	let expected = false;
	if (returnedValue && didJob) {
		expected = true;
	}
	expect(expected).toBe(true);
});

test("Delete non-existant folder", async () => {
	let testLoc = `${path}/emptydelete0`;
	rimraf.sync(testLoc);
	let returnedValue = await filesystem.deleteFileOrDirIfExists(testLoc);
	let didJob = !fs.existsSync(testLoc);
	let expected = false;
	if (!returnedValue && didJob) {
		expected = true;
	}
	expect(expected).toBe(true);
});

test("Delete existant folder", async () => {
	let testLoc = `${path}/emptydelete1`;
	if (!fs.existsSync(testLoc)) {
		fs.mkdirSync(testLoc);
	}
	let returnedValue = await filesystem.deleteFileOrDirIfExists(testLoc);
	let didJob = !fs.existsSync(testLoc);
	let expected = false;
	if (returnedValue && didJob) {
		expected = true;
	}
	expect(expected).toBe(true);
});
