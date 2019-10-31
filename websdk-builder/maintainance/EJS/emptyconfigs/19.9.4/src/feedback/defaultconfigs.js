/**
 * Default feedback configs
 *
 * (c) Copyright 2019 ForeSee, Inc.
 */

import { ext, getProductConfig } from "../fs/index";

function setupDefaultFeedbackConfigs() {
  const config = getProductConfig("feedback");

  // Begin by extending the config with some default params
  const extdConfig = ext(
    {
      /**
       * List of unsupported browsers and platforms supported
       * Note: IE 𝓍 means we support 𝓍 and above
       */
      browser_cutoff: {
        Edge: 1,
        IE: 11,
        IEMobile: 10,
        Safari: 5.2,
        Firefox: 30,
        Chrome: 30,
        Opera: 1000,
      },

      /**
       * List of unsupported platforms
       * Note: Android 4 means we support 4 and above
       */
      platform_cutoff: {
        Android: 5.0,
        Winphone: 7.4,
        iPod: 9,
        iPhone: 9,
        iPad: 9,
      },
    },
    config
  );

  // Can't modify something imported from elsewhere, but we can
  // modify its properties.
  ext(config, extdConfig);
}

export { setupDefaultFeedbackConfigs };
