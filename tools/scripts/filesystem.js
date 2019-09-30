const rimraf = require("rimraf"),
  copydir = require("copy-dir"),
  fs = require("fs");

//NEED TO REVISIT TWO THINGS TO COMPLETE EVERYTHING BEING HERE, both in tools/magic.js :
// - getCustom
// - readFile
// also, node-gitsync.js is using some so if we can get rid of that and replace it with our own git call that would be good

function checkIfFileOrDirExists(path, consoleMsg) {
  if (fs.existsSync(path)) {
    if (consoleMsg) {
      console.log(consoleMsg);
    }
    return true;
  }
  return false;
}

function makeDirIfMissing(path, consoleMsg) {
  if (consoleMsg) {
    console.log(consoleMsg);
  }
  let folders = path.split("/");
  path = folders[0];
  for (let counter = 1; counter < path.length; counter++) {
    path += `/${folders[counter]}`;
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path);
    }
  }
  return true;
}

function deleteFileOrDirIfExists(path, consoleMsg) {
  if (fs.existsSync(path)) {
    if (consoleMsg) {
      console.log(consoleMsg);
    }
    rimraf.sync(path);
    return true;
  }
  return false;
}

function copyFrom2ToIfFromExists(from, to, consoleMsg) {
  if (fs.existsSync(from)) {
    if (consoleMsg) {
      console.log(consoleMsg);
    }
    copydir.sync(from, to, {
      utimes: false,
      mode: false,
      cover: false
    });
    return true;
  }
  return false;
}

function copyFrom2ToIfToMissing(from, to, consoleMsg) {
  if (!fs.existsSync(to)) {
    if (consoleMsg) {
      console.log(consoleMsg);
    }
    copydir.sync(from, to, {
      utimes: false,
      mode: false,
      cover: false
    });
    return true;
  }
  return false;
}

function readFileToStringIfExists(path, consoleMsg) {
  if (consoleMsg) {
    console.log(consoleMsg);
  }
  let string;
  if (fs.existsSync(path)) {
    string = readFileSync(path);
  }
  return string;
}

function writeToFile(path, fileContents, consoleMsg) {
  if (consoleMsg) {
    console.log(consoleMsg);
  }
  fs.writeFileSync(path, fileContents, function(err) {
    if (err) {
      return reject(err);
    }
  });
  return true;
}

module.exports = {
  checkIfFileOrDirExists,
  makeDirIfMissing,
  deleteFileOrDirIfExists,
  copyFrom2ToIfFromExists,
  copyFrom2ToIfToMissing,
  readFileToStringIfExists,
  writeToFile
};
