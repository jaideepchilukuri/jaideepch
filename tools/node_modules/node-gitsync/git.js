'use strict';
/**
 * The main client class
 * @param loc
 * @constructor
 */
var Client = function (loc) {
  this.Git = require('simple-git')(loc);
};

/*
 Git commands
 */
Client.prototype.clone = function (repoURL, branch, cb) {
  //Make sure there is a callback
  var cb = cb || function () {
    console.log('repo cloned');
  }
  //if branch is specified set options arr.
  if (branch) {
    var optionsArr = ['-b' + branch];
  } else {
   console.log('Please specify a branch.');
   return;
  }
  console.log("Starting to clone branch " + branch)
  this.Git.clone(repoURL, branch, optionsArr, cb);
};

Client.prototype.pull = function (repoURL, branch, cb) {
  this.Git.pull(repoURL, branch, cb)
};

Client.prototype.addTag = function (tagName, cb) {
  tagName ? this.Git.addTag(tagName, cb) : console.log('Please input a tag name');
};

Client.prototype.checkoutLocalBranch = function (branchName, cb) {
  branchName ? this.Git.checkoutLocalBranch(branchName, cb) : console.log('Please input a branch name');
};

Client.prototype.checkoutLatestTag = function (cb) {
  this.Git.checkoutLatestTag(cb);
}

Client.prototype.add = function (param) {
  //TODO: loop through the arguments and see if they are a function, if they are not a function push them into a single array and pass to fn.
  var param = param || './*';
  this.Git.add(param);
}

Client.prototype.commit = function (message) {
  this.Git.commit(message);
}

Client.prototype.push = function (remote, branch, cb) {
  this.Git.push(remote, branch, cb)
}

Client.prototype.pushTags = function (remote, cb) {
  this.Git.pushTags(remote, cb);
}

Client.prototype.rm = function (file, cb) {
  this.Git.rm(file, cb);
}

Client.prototype.status = function () {
  this.Git.status();
}

module.exports = Client;
