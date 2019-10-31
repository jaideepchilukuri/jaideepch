import { _W } from "../../fs/util/quickrefs";
import { eachProp, isDefined } from "../../fs/index";
import { getNested } from "../lib/qamode";

/**
 * Traverses a config object looking to replace the following shape with a window variable:
 *
 *   ```
 *   {
 *     source: "variable",
 *     path: "path.to.variable",
 *     default: "default value"
 *   }
 *   ```
 *
 * @param {*} config the config to traverse
 * @returns config
 */
function dynamicConfigReplacer(config) {
  if (typeof config === "object") {
    eachProp(config, (val, key) => {
      if (typeof val !== "object" || val == null) return;

      // if it doesn't look like a dynamic config definition
      if (val.source !== "variable" || !isDefined(val.default) || !isDefined(val.path)) {
        // recurse instead
        dynamicConfigReplacer(val);
        return;
      }

      // retrieve value from window
      const place = getNested(_W, val.path, true);
      let value = place && place.obj[place.key];

      // if null or undefined, set to default
      if (!isDefined(value) || value === null) {
        config[key] = val.default;
        return;
      }

      if (typeof value === "function" || typeof value === "object") {
        throw new Error(
          `Cannot replace config setting ${key} with path ${val.path} with a ${typeof value}`
        );
      }

      // need to coerce type to be the same as the default
      switch (typeof val.default) {
        case "string":
          value = escapeHTML(String(value));
          break;

        case "number":
          value = parseFloat(value);
          break;

        case "boolean":
          if (String(value) === "false") {
            value = false;
          } else {
            value = Boolean(value);
          }
          break;

        default:
          throw new Error(
            `Default for ${key} replaced with path ${
              val.path
            } is invalid type ${typeof val.default}`
          );
      }

      // set it
      config[key] = value;
    });
  }
  return config;
}

const htmlEscapeRegex = /[&<>"']/g;
const htmlEscapes = {
  "&": "&amp;",
  "<": "&lt;",
  ">": "&gt;",
  '"': "&quot;",
  "'": "&#39;",
};

/**
 * Escape HTML by replacing with entities
 */
function escapeHTML(v) {
  // testing first should be slightly faster for strings without html
  if (htmlEscapeRegex.test(v)) {
    return v.replace(htmlEscapeRegex, m => htmlEscapes[m]);
  }
  return v;
}

export { dynamicConfigReplacer };
