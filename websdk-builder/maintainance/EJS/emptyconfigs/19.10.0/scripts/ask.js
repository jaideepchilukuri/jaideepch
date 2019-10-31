/* eslint-env node */
const promptConfirm = require("@gidw/prompt-confirm");

function ask(question, def) {
  return new Promise(resolve => {
    promptConfirm(question, def, resolve);
  });
}

module.exports = { ask };
