/* eslint-env node */
// ES6 methods are safe to use in Node>=10
/* eslint-disable es5/no-es6-methods, es5/no-es6-static-methods */

const { minify } = require("terser");

function terser(userOptions = {}) {
  if (userOptions.sourceMap != null) {
    throw Error("sourceMap option is removed, use sourcemap instead");
  }

  return {
    name: "terser",

    renderChunk(code, chunk, outputOptions) {
      const normalizedOptions = Object.assign({}, userOptions, {
        sourceMap: userOptions.sourcemap !== false,
        module: outputOptions.format === "es" || outputOptions.format === "esm",
      });

      // eslint-disable-next-line es5/no-for-of
      for (const key of ["sourcemap"]) {
        // eslint-disable-next-line no-prototype-builtins
        if (normalizedOptions.hasOwnProperty(key)) {
          delete normalizedOptions[key];
        }
      }

      const result = minify(code, normalizedOptions);

      if (result.error) throw result.error;

      return result;
    },
  };
}

module.exports = { terser };
