const spawn = require("child_process").spawn,
  simplegit = require("simple-git/promise")(),
  syncrequest = require("sync-request"),
  readline = require("readline-sync"),
  atob = require("atob");

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

function doAGit(args, errLogic) {
  let argString = JSON.stringify(args);
  if (argString.includes("https://github.com")) {
    // using this as the search because so far only using the url when getting errors because we need a un/pw to get access
    let unpw = getUnPw(
      "What is your username for github?",
      "What is your password for github?"
    );
    for (let counter = 0; counter < commands.length; counter++) {
      commands[counter] = commands[counter].replace(
        "https://github.com",
        `https://${unpw}@github.com`
      );
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
  return simplegit.raw(args);
}

function httpRequest(type, url, options) {
  if (options) {
    return syncrequest(type, url, options);
  }
  return syncrequest(type, url);
}

function multipartPost(url, formdata) {
  return request.post({
    url: url,
    formData: formdata
  });
}

function askQuestion(text, options) {
  if (options) {
    return readline.question(text, options);
  }
  return readline.question(text);
}

function getUnPw(untext, pwtext) {
  let un = other.askQuestion(untext + " ");
  let pw = other.askQuestion(pwtext + " ", {
    hideEchoBack: true
  });
  return `${un}:${pw}`;
}

function aTob(string) {
  return atob(string);
}

module.exports = {
  spawnProcess,
  doAGit,
  httpRequest,
  multipartPost,
  askQuestion,
  getUnPw,
  aTob
};
