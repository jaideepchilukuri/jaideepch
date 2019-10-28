/* eslint-env node */
module.exports = api => {
  const isTest = api.env("test");
  return {
    presets: [
      [
        "@babel/env",
        {
          targets: {
            ie: "11",
            edge: "15",
            firefox: "55",
            chrome: "55",
            safari: "9",
            ios: "9",
            android: "5",
          },

          // no polyfills
          useBuiltIns: false,

          // don't need to be spec compliant, unless in tests
          loose: !isTest,

          // disable anything that uses generators or regenerator runtime
          exclude: [
            "proposal-async-generator-functions",
            "transform-async-to-generator",
            "transform-exponentiation-operator",
            "transform-regenerator",
          ],

          // make sure we don't accidently override the above browser version list
          ignoreBrowserslistConfig: true,
        },
      ],
    ],
    ignore: ["/node_modules/"],
  };
};
