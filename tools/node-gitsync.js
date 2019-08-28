/**
 * Dependencies
 */
const fs = require("fs");
const rimraf = require("rimraf");
const simpleGit = require("simple-git");

/**
 * Is the dir empty?
 * @param dirname
 * @param cb
 */
function isDirEmpty(dirname, cb) {
  fs.readdir(dirname, function(err, files) {
    if (err) {
      // some sort of error
      cb({ message: "error" }, true);
    } else {
      if (!files.length) {
        // directory appears to be empty
        cb(null, true);
      } else {
        cb(null, false);
      }
    }
  });
}

/**
 * Synchronizes a remote svn repo
 * @constructor
 */

var GITSync = function(obj, cb) {
  var loc = obj.dest;
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
  cb =
    cb ||
    function() {
      console.log("Git Sync finished.");
    };

  // Decide where this goes
  var fullqualifiedplace = obj.dest + "/" + obj.branch,
    needToSync = false;

  fullqualifiedplace = fullqualifiedplace.replace(/\/\//g, "/");

  // Check if we need to make the parent folder
  if (!fs.existsSync(obj.dest)) {
    fs.mkdirSync(obj.dest);
    needToSync = true;
  }
  if (!fs.existsSync(fullqualifiedplace)) {
    fs.mkdirSync(fullqualifiedplace);
    needToSync = true;
  }

  isDirEmpty(fullqualifiedplace, function(err, isempty) {
    if (isempty || needToSync) {
      var client = new simpleGit(obj.dest);
      console.info(
        "gitsync".yellow +
          ": ".grey +
          "Wait a moment, pulling repo " +
          obj.repo.magenta +
          " branch " +
          obj.branch.magenta +
          " to " +
          fullqualifiedplace.magenta +
          "..."
      );

      client.raw(["clone", "-b", obj.branch, obj.repo, obj.branch], function(err, result) {
        if (err) {
          rimraf(fullqualifiedplace, function() {
            cb(err);
          });
        } else {
          cb();
        }
      });
    } else {
      cb();
    }
  });
};

/**
 * Expose the class to the world
 * @type {Function}
 */

module.exports = GITSync;
