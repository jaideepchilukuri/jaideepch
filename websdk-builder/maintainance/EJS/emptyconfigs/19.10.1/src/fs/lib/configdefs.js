/**
 * Holds the global configuration
 * @type {{}}
 */
let globalConfig = {}; // eslint-disable-line prefer-const
let productConfig = {}; // eslint-disable-line prefer-const

/**
 * @preserve
 * [GENERAL_CONFIG]
 */
delete globalConfig._; // so the above comment is not removed

/* pragma:DEBUG_START */
const validProducts = "feedback trigger record".split(" ");
/* pragma:DEBUG_END */

/**
 * Get a product config for a specific product
 * @param {string} product
 * @returns {*} the config for the product
 */
function getProductConfig(product) {
  /* pragma:DEBUG_START */
  if (validProducts.indexOf(product) < 0) {
    throw new Error(`Unknown product: ${product}`);
  }
  /* pragma:DEBUG_END */

  return productConfig[product];
}

/**
 * For tests (and gateway) only, set the product config.
 * Generally, you would import the product config you would need and then
 * use this method in a beforeEach() to set the product config for your test.
 * @param {string} product
 * @param {*} value config for the product
 */
function setProductConfig(product, value) {
  /* pragma:DEBUG_START */
  if (validProducts.indexOf(product) < 0) {
    throw new Error(`Unknown product: ${product}`);
  }
  /* pragma:DEBUG_END */

  productConfig[product] = JSON.parse(JSON.stringify(value));
}

/**
 * For tests (and gateway) only, set the global config.
 * Generally, you would import the global config then use this method in
 * a beforeEach() to set the global config for your test.
 * @param {*} config the new global config
 */
function setGlobalConfig(config) {
  globalConfig = JSON.parse(JSON.stringify(config));
}

export { globalConfig, productConfig, getProductConfig, setProductConfig, setGlobalConfig };
