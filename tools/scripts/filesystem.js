const ejs = require("ejs"),
  unzip = require("unzip-stream"),
  rimraf = require("rimraf"),
  copydir = require("copy-dir"),
  fs = require("fs");

async function checkIfFileOrDirExists(path, consoleMsg) {
  if (fs.existsSync(path)) {
    if (consoleMsg) {
      console.log(consoleMsg);
    }
    return true;
  }
  return false;
}

async function makeDirIfMissing(path, consoleMsg) {
  if (consoleMsg) {
    console.log(consoleMsg);
  }
  let folders = path.split("/");
  path = folders[0];
  for (let counter = 1; counter < folders.length; counter++) {
    path += `/${folders[counter]}`;
    if (!fs.existsSync(path)) {
      fs.mkdirSync(path);
    }
  }
  return true;
}

async function deleteFileOrDirIfExists(path, consoleMsg) {
  if (fs.existsSync(path)) {
    if (consoleMsg) {
      console.log(consoleMsg);
    }
    rimraf.sync(path + "/");
    return true;
  }
  return false;
}

async function copyFrom2ToIfFromExists(from, to, consoleMsg) {
  if (fs.existsSync(from)) {
    if (consoleMsg) {
      console.log(consoleMsg);
    }
    await deleteFileOrDirIfExists(to /*, "deleted a folder to copy " + from + " to " + to*/);
    copydir.sync(from, to, {
      utimes: true,
      mode: true,
      cover: true,
    });
    return true;
  }
  return false;
}

async function copyFrom2ToIfToMissing(from, to, consoleMsg) {
  if (!fs.existsSync(to)) {
    if (consoleMsg) {
      console.log(consoleMsg);
    }
    copydir.sync(from, to, {
      utimes: false,
      mode: false,
      cover: false,
    });
    return true;
  }
  return false;
}

async function readFileToStringIfExists(path, consoleMsg) {
  if (consoleMsg) {
    console.log(consoleMsg);
  }
  let string;
  if (fs.existsSync(path)) {
    string = fs.readFileSync(path, "utf8");
  }
  return string;
}

async function readFileToObjectIfExists(path, consoleMsg) {
  let string = await readFileToStringIfExists(path, consoleMsg);
  if (string) {
    return JSON.parse(string);
  }
  console.log("Got an undefined string in readFileToObjectIfExists", path);
  return undefined;
}

async function readFileToReadStream(path) {
  return fs.createReadStream(path);
}

async function writeToFile(path, fileContents, consoleMsg) {
  if (consoleMsg) {
    console.log(consoleMsg);
  }
  if (typeof fileContents == "object") {
    fileContents = JSON.stringify(fileContents);
  }
  fs.writeFileSync(path, fileContents, function(err) {
    if (err) {
      return reject(err);
    }
  });
  return true;
}

async function writeZip(path, fileContents, consoleMsg) {
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

async function unzipAssets(path) {
  await makeDirIfMissing(`${path}/`);
  await fs
    .createReadStream(`${path}.zip`)
    .pipe(unzip.Parse())
    .on("entry", function(entry) {
      if (
        entry.path !== "trigger/" &&
        entry.path.substr(0, 8) === "trigger/" &&
        entry.path.substr(0, 18) !== "trigger/templates/"
      ) {
        if (entry.type == "Directory") {
          filesystem.makeDirIfMissing(`${path}/${entry.path}`);
        } else {
          entry.pipe(fs.createWriteStream(`${path}/${entry.path.substr(8)}`));
        }
      } else {
        entry.autodrain();
      }
    });
  let assetsLoc = path.split("/");
  assetsLoc = assetsLoc[assetsLoc.length - 2] + "/" + assetsLoc[assetsLoc.length - 1];
  console.log(assetsLoc);
}

async function buildFileContentsFromTemplateFile(filename, data, delimiter) {
  if (!delimiter) {
    delimiter = "%";
  }
  return await ejs.renderFile(filename, data, { delimiter: delimiter });
}

module.exports = {
  checkIfFileOrDirExists,
  makeDirIfMissing,
  deleteFileOrDirIfExists,
  copyFrom2ToIfFromExists,
  copyFrom2ToIfToMissing,
  readFileToStringIfExists,
  readFileToObjectIfExists,
  readFileToReadStream,
  writeToFile,
  writeZip,
  unzipAssets,
  buildFileContentsFromTemplateFile,
  rimraf,
};
