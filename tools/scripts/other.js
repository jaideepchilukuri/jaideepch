const spawn = require("child_process").spawn,
  simplegit = require("simple-git/promise")(),
  syncrequest = require("sync-request"),
  request = require("request"),
  readline = require("readline-sync"),
  atob = require("atob");
const filesystem = require("./filesystem");

function wrap(fn) {
  return function(...args) {
    return fn(...args).catch(err => {
      console.error(err);
      process.exit(1);
      return null;
    });
  };
}

async function spawnProcess(command, args, options) {
  if (!options) {
    options = { cwd: process.cwd(), stdio: "inherit", shell: true };
  }
  // *** Return the promise
  return new Promise(function(resolve, reject) {
    const child = spawn(command, args, options);
    child.on("exit", function(code) {
      return resolve(code);
    });
    child.on("error", function(err) {
      return reject(err);
    });
  });
}

async function doAGit(args /*errLogic*/) {
  let argString = JSON.stringify(args);
  if (argString.includes("https://github.com") && args[0] != "clone") {
    // using this as the search because so far only using the url when getting errors because we need a un/pw to get access
    let unpw = await getUnPw("What is your username for github?", "What is your password for github?");
    for (let counter = 0; counter < args.length; counter++) {
      args[counter] = args[counter].replace("https://github.com", `https://${unpw}@github.com`);
    }
  }
  /*if (errLogic) {
    return simplegit.raw(args, function(err, result) {
      if (err) errLogic;
      else {
        cb();
      }
    });
  }*/
  return await simplegit.raw(args);
}

async function httpRequest(type, url, options) {
  if (options) {
    return await syncrequest(type, url, options);
  }
  return await syncrequest(type, url);
}

async function multipartPost(url, notes, fileLoc) {
  let formdata = { notes: notes, config: await filesystem.readFileToReadStream(fileLoc) };
  request.post(
    {
      url: url,
      formData: formdata,
    },
    function optionalCallback(err, httpResponse, body) {
      if (err) {
        return console.error("upload failed:", err);
      }
      console.log("Contact successful... Server responded with:", body);
    }
  );
  await filesystem.deleteFileOrDirIfExists(fileLoc);
  return true;
}

async function askQuestion(text, options) {
  if (options) {
    return readline.question(text, options);
  }
  return readline.question(text);
}

async function getUnPw(untext, pwtext, emailString) {
  let un = await askQuestion(untext + " ");
  let pw = await askQuestion(pwtext + " ", {
    hideEchoBack: true,
  });
  if (emailString) {
    return `${un}${emailString}:${pw}`;
  }
  return `${un}:${pw}`;
}

async function aTob(string) {
  return atob(string);
}

module.exports = {
  wrap,
  spawnProcess,
  doAGit,
  httpRequest,
  multipartPost,
  askQuestion,
  getUnPw,
  aTob,
};
