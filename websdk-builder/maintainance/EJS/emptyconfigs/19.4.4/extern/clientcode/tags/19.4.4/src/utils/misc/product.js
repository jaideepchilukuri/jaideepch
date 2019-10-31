/**
 * Nexus for individual products
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.Utils.Misc.Product");

fs.require("fs.Top");

(function (utils) {

  /**
   * Holds the list of active products
   * @type {{}}
   */
  utils.products = {};

  /**
   * An array of products
   * @type {Array}
   */
  utils.productArr = [];

  /**
   * Notify us of a product
   * @param productname
   */
  utils.registerProduct = function(productname, info) {
    info = info || {};
    utils.products[productname] = info;
    utils.productArr.push(productname);
  };

})(utils);