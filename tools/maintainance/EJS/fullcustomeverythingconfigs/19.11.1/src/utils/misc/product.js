/**
 * Nexus for individual products
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

/**
 * Holds the list of active products
 * @type {{}}
 */
const products = {};

/**
 * An array of products
 * @type {Array}
 */
const productArr = [];

/**
 * Notify us of a product
 * @param productname
 */
const registerProduct = (productname, info) => {
  info = info || {};
  products[productname] = info;
  productArr.push(productname);
};

export { products, registerProduct };
