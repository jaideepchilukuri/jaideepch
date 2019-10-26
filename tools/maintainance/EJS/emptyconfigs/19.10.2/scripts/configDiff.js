/* eslint-env node */
// ES6 methods are safe to use in Node>=10
/* eslint-disable es5/no-es6-methods, es5/no-es6-static-methods */

const { getAllConfigs } = require("./SDKConfigs.js");
const request = require("request");

/**
 * Compare a configured sitekey on the QA FCP server to the local configs, and
 * generate a series of FSR.QA commands to morph the sitekey's configs to be the same.
 */
function compareConfig(env, cb) {
  const configs = getAllConfigs(env);
  delete configs.gateway;
  delete configs.feedback;
  configs.record = JSON.parse(configs.record);
  configs.trigger = JSON.parse(configs.trigger);

  unbase64SurveyDefs(configs);

  // todo: parameterize the fcp server hostname
  const sitekey = configs.global.siteKey;
  const url = `https://qa-gateway-elb.foresee.com/sites/${sitekey}/${env}/config.json`;
  request(url, function(err, response, body) {
    if (err) {
      cb(err);
      return;
    }
    if (response.statusCode !== 200) {
      return cb(new Error(body));
    }

    const remoteConfig = JSON.parse(body);

    unbase64SurveyDefs(remoteConfig);

    console.log("---------- >% -----------\n");
    compareFromTo(configs, remoteConfig, []);
    console.log("\n---------- >% -----------");

    cb();
  });
}

/**
 * Undo the base64 encoding of the survey defs and convert to javascript objects
 *
 * todo: hopefully this can be removed in the future
 */
function unbase64SurveyDefs(configs) {
  if (configs.trigger && configs.trigger.surveydefs) {
    for (let p = 0; p < configs.trigger.surveydefs.length; p++) {
      if (typeof configs.trigger.surveydefs[p] === "string") {
        const code = Buffer.from(configs.trigger.surveydefs[p], "base64").toString();
        configs.trigger.surveydefs[p] = new Function(
          `var v = ''; try { v = ${code}} catch(err) {}return v;`
        )();
      }
    }
  }
}

/**
 * Compare and produce API calls
 */
function compareFromTo(from, to, path) {
  const dotpath = path.join(".");

  if (Array.isArray(from)) {
    compareArrays(from, to, dotpath, path);
  } else if (from !== null && typeof from === "object") {
    // detect displays, and figure out if the modern/legacy desktop displays have been swapped
    compareObjects(from, to, dotpath, path);
  } else if (from !== to) {
    if (
      dotpath.startsWith("global.") &&
      (dotpath.endsWith("Url") ||
        dotpath.endsWith("codeVer") ||
        dotpath.startsWith("global.products") ||
        dotpath.startsWith("global.featureFlags"))
    ) {
      return;
    }

    console.log(`FSR.QA.set("${dotpath}", ${JSON.stringify(from)})`);
  }
}

/**
 * Compare an array subtree of the configs
 */
function compareArrays(from, to, dotpath, path) {
  if (!to || !Array.isArray(to)) {
    console.log(`FSR.QA.set("${dotpath}", []);`);
    to = [];
  }
  let i;
  for (i = 0; i < from.length; i++) {
    to = handleAppends(from, to, i, dotpath);
    compareFromTo(from[i], to[i], path.concat([i]));
  }

  // delete extras off the end of the array
  while (i < to.length) {
    console.log(`FSR.QA.remove("${dotpath}.${i}");`);
    to.pop();
  }
}

/**
 * Handle an append to an array, with a special case for large object appends
 */
function handleAppends(from, to, i, dotpath) {
  if (to.length <= i) {
    if (
      typeof from[i] === "object" &&
      from[i] !== null &&
      i > 0 &&
      JSON.stringify(from[i]).length > 30
    ) {
      // special case to handle new survey defs and other similar large object appends
      console.log(`FSR.QA.copy("${dotpath}.${i - 1}", "${dotpath}.${i}");`);
      to[i] = JSON.parse(JSON.stringify(from[i - 1]));
    } else {
      console.log(`FSR.QA.append("${dotpath}", ${JSON.stringify(from[i])});`);
      to = to.concat([from[i]]);
    }
  }
  return to;
}

/**
 * Compare an object subtree of the configs
 */
function compareObjects(from, to, dotpath, path) {
  handleRenamedDisplays(from, to, dotpath);

  if (!to || typeof to !== "object") {
    console.log(`FSR.QA.set("${dotpath}", {});`);
    to = {};
  }

  handleRemovedProperties(from, to, dotpath);

  Object.keys(from).forEach(function(key) {
    compareFromTo(from[key], to[key], path.concat([key]));
  });
}

/**
 * Handle properties being removed from an object
 */
function handleRemovedProperties(from, to, dotpath) {
  Object.keys(to).forEach(function(key) {
    if (
      from[key] === undefined &&
      to[key] !== undefined &&
      `${dotpath}.${key}` !== "global.environment"
    ) {
      console.log(`FSR.QA.remove("${dotpath}.${key}");`);
    }
  });
}

/**
 * Handle a special case of displays having their property names renamed,
 * specifically when a classic invite is renamed to desktop and modern is
 * renamed or removed
 */
function handleRenamedDisplays(from, to, dotpath) {
  if (
    from.desktop &&
    from.mobile &&
    from.desktop.length &&
    from.desktop[0].template &&
    to &&
    to.desktop.length &&
    to.desktop[0].template &&
    from.desktop[0].template !== to.desktop[0].template
  ) {
    let toKey, fromKey;
    Object.keys(to).forEach(function(key) {
      if (to[key].length && to[key][0].template === from.desktop[0].template) {
        // found the swap
        toKey = key;
      }
    });
    Object.keys(from).forEach(function(key) {
      if (from[key].length && from[key][0].template === to.desktop[0].template) {
        // found the swap
        fromKey = key;
      }
    });
    to[fromKey] = to.desktop;
    if (fromKey) {
      console.log(`FSR.QA.copy("${dotpath}.desktop", "${dotpath}.${fromKey}");`);
    }
    to.desktop = to[toKey];
    console.log(`FSR.QA.copy("${dotpath}.${toKey}", "${dotpath}.desktop");`);
    delete to[toKey];
    console.log(`FSR.QA.remove("${dotpath}.${toKey}");`);
  }
}

module.exports = {
  compareConfig,
};
