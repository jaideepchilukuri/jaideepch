/* eslint-env node */

const fs = require("fs");
const rimraf = require("rimraf");

function cleanDist(dist, cb) {
  rimraf(`${dist}/*`, cb);
}

function createDistFolders(dist, version, cb) {
  const folders = [
    dist,
    `${dist}/code`,
    `${dist}/code/${version}`,
    `${dist}/trigger`,
    `${dist}/record`,
  ];
  folders.forEach(function(folder) {
    if (!fs.existsSync(folder)) {
      fs.mkdirSync(folder);
    }
  });
  cb();
}

module.exports = {
  cleanDist,
  createDistFolders,
};
