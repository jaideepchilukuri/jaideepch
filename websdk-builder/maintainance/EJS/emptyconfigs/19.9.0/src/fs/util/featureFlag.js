import { globalConfig } from "../lib/configdefs";

/**
 * Reads the status of a feature flag and execute the provided callbacks.
 * @param {String} flagName
 * @param {Object} [option]
 * @param {Function} [option.on] executed if flag is true. `after` will be passed if an argument is expected
 * @param {Function} [option.off] executed if flag is false. `after` will be passed if an argument is expected
 * @param {Function} [option.after] executed after `on` or `off` are done, or as callback of either
 */
function featureFlag(flagName, option) {
  option = option || {};
  option.after = option.after || (() => {});

  if (!flagName) {
    /* pragma:DEBUG_START */
    console.error(
      "ff: invalid argument: expected (flagName:String, [option:Object]) but got",
      flagName,
      option
    );
    /* pragma:DEBUG_END */

    option.after();
    return null;
  }

  if (!globalConfig.featureFlags) {
    /* pragma:DEBUG_START */
    console.warn("ff: missing featureFlags configuration in globalConfig.", { globalConfig });
    /* pragma:DEBUG_END */

    option.after();
    return null;
  }

  const flagValue = globalConfig.featureFlags[flagName];

  if (typeof flagValue !== "boolean") {
    /* pragma:DEBUG_START */
    console.warn("ff: missing or invalid flag", {
      [flagName]: globalConfig.featureFlags[flagName],
    });
    /* pragma:DEBUG_END */

    option.after();
    return null;
  }

  if (flagValue && typeof option.on === "function") {
    option.on(option.after);

    // If on() actually doesnt have an argument, call option.after()
    if (option.on.length < 1) {
      option.after();
    }

    return flagValue;
  }

  if (!flagValue && typeof option.off === "function") {
    option.off(option.after);

    // If off() actually doesnt have an argument, call option.after()
    if (option.off.length < 1) {
      option.after();
    }

    return flagValue;
  }
}

export { featureFlag };
