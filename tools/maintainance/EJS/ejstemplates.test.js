//to run these tests, cd tools if you aren't already in the tools folder
//then run this command: npm test maintainance/EJS/ejstemplates.test.js
//note: you may also have to change this value:
const codeVersionToTest = "19.11.1";
//other values you may want to change:
//and the list of maintainance->EJS local folders/sitekeys to test
const sitekeys = ["emptyconfigs", "fullcustomeverythingconfigs"];
//and the list of files we want to check
const filestocheck = [
	"globalconfig/local",
	"client_properties",
	//"productconfig/fbmods/product_config",
	"productconfig/record/product_config",
	"productconfig/trigger/product_config",
	"productconfig/trigger/surveydef/def",
];
//and whether or not to overwrite the config.json files in the clientconfig/sitekey folder if they exist already
const overwriteSitekeysConfigJSONifExists = true;
//and whetrher or not to delete the test config folders from tools/clientconfigs after running the tests
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

/* beforeAll(async () => {
	for (counter in sitekeys) {
		await etthf.buildForTemplateTest(sitekeys[counter], codeVersionToTest, overwriteSitekeysConfigJSONifExists);
	}
});

afterAll(async () => {
	console.log(`Completed tests for sitekeys ${JSON.stringify(sitekeys)} on code version ${codeVersionToTest}`);
	for(counter in sitekeys){
		await etthf.cleanUpTemplateTest(sitekeys[counter]);
	}
});

it.each(sitekeys)("Check template globalconfig/local against expected for sitekey %s", async sitekey => {
	let matching = await etthf.testTemplateGlobalConfigLocal(sitekey, codeVersionToTest, "globalconfig/local");
	expect(matching).toBe(true);
});

test.each(sitekeys)("Check template client_properties against expected for sitekey %s", async sitekey => {
	let matching = await etthf.testTemplateClientProperties(sitekey, codeVersionToTest, "client_properties");
	expect(matching).toBe(true);
});

test.each(sitekeys)("Check template record/product_config against expected for sitekey %s", async sitekey => {
	let matching = await etthf.testTemplateRecordProductConfig(
		sitekey,
		codeVersionToTest,
		"productconfig/record/product_config"
	);
	expect(matching).toBe(true);
});

test.each(sitekeys)("Check template trigger/product_config against expected for sitekey %s", async sitekey => {
	let matching = await etthf.testTemplateTriggerProductConfig(
		sitekey,
		codeVersionToTest,
		"productconfig/trigger/product_config"
	);
	expect(matching).toBe(true);
});

test.each(sitekeys)("Check template surveydef against expected for sitekey %s", async sitekey => {
	let matching = await etthf.testTemplateSurveyDefs(sitekey, codeVersionToTest, "productconfig/trigger/surveydef/def");
	expect(matching).toBe(true);
});
 */
