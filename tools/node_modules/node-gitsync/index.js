/**
 * Dependencies
 */
var gitclient = require('./git'),
    fs        = require('fs'),
    rimraf    = require('rimraf');

/**
 * Synchronizes a remove svn repo
 * @constructor
 */

var GITSync = function (obj, cb) {

  var loc = obj.dest,
      Git = require('simple-git');

  if (!obj.dest) {
    throw new Error("Destination (dest) folder is required.");
  }

  if (!obj.branch) {
    throw new Error("Repo branch (branch) is required.");
  }

  if (!obj.repo) {
    throw new Error("Remote repository (repo) is required.");
  }

  // Make sure there is a callback
  cb = cb || function () {
      console.log("Git Sync finished.");
    };

  // Decide where this goes
  var fullqualifiedplace  = obj.dest + '/' + obj.branch;

  /**
   * Runs the actual sync
   */
  function runsync() {

    var client = new gitclient(loc);

    if (fs.existsSync(fullqualifiedplace)) {
      console.log('Folder already exists, exiting.');
      cb();
    } else {
      // Make the tag folder if it doesn't exist
      if (!fs.existsSync(fullqualifiedplace)) {
        fs.mkdir(fullqualifiedplace);
      }

      console.info("Wait a moment, pulling repo " + obj.repo + "...");

      client.clone(obj.repo, obj.branch, function (err, data) {
        if (err) {
          rimraf(loc + obj.branch);
          cb(err);
        } else {
          cb();
        }
      });
    }
  }

  // Check to see if we already have it
  if (fs.existsSync(fullqualifiedplace)) {
    console.log('Folder already exists, exiting.');
    cb();
  } else {
    runsync();
  }

};

/**
 * Expose the class to the world
 * @type {Function}
 */

module.exports = GITSync;
