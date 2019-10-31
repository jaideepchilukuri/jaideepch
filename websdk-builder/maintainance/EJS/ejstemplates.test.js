// to run these tests, cd tools if you aren't already in the tools folder
// then run this command: npm test maintainance/EJS/ejstemplates.test.js
// note: you may also have to change this value:
const codeVersionToTest = "19.11.1";
// other values you may want to change:
// the list of maintainance->EJS local folders/sitekeys to test
const sitekeys = ["emptyconfigs", "fullcustomeverythingconfigs"];
// the list of files we want to check
const filestocheck = [
	"globalconfig/local",
	"client_properties",
	//"productconfig/fbmods/product_config",
	"productconfig/record/product_config",
	"productconfig/trigger/product_config",
	"productconfig/trigger/surveydef/def",
];
// whether or not to overwrite the config.json files in the clientconfig/sitekey folder if they exist already
const overwriteSitekeysConfigJSONifExists = true;
// whether or not to delete the test config folders from tools/clientconfigs after running the tests
const deleteSitekeysWhenFinished = true;

const etthf = require("./ejstemplatetesthelperfunctions");

describe.each(sitekeys)("Checking Templates For Sitekey: %s", sitekey => {
	jest.setTimeout(1000000); // 100 second timeout

	beforeAll(async () => {
		await etthf.buildForTemplateTest(sitekey, codeVersionToTest, overwriteSitekeysConfigJSONifExists);
	});

	describe.each(filestocheck)("Checking Template File: %s", filename => {
		it("Matches: expected vs created by template", async () => {
			let matching = await etthf.testTemplate(sitekey, codeVersionToTest, filename);
			expect(matching).toBe(true);
		});
	});

	afterAll(async () => {
		// console.log(`Completed template tests for sitekey ${sitekey} on code version ${codeVersionToTest}`);
		if (deleteSitekeysWhenFinished) {
			//would like to replace this hardcoded boolean if statement with logic that says if all tests for this sitekey passed, delete it
			await etthf.cleanUpTemplateTest(sitekey);
		}
	});
});
