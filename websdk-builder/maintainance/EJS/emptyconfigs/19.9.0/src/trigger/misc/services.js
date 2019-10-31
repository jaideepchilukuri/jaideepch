/**
 * Remote services calls.
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { globalConfig } from "../../fs/index";
import { ImageTransport } from "../../utils/utils";

/**
 * @class Service configurations.
 */
const Services = {
  /**
   * The list of possible service calls
   */
  SERVICE_TYPES: {
    /**
     * The mobileOnExit service initialize configuration
     */
    mobileOnExitInitialize: {
      path: "/e",
      url: "/initialize",
    },

    /**
     * The mobileOnExit service heartbeat configuration
     */
    mobileOnExitHeartbeat: {
      path: "/e",
      url: "/recordHeartbeat",
    },
  },
};

/**
 * Log a message to the server without much in the way of parameters.
 * @param servicetype {Services.SERVICE_TYPES} The service to call.
 * @param param {Object} A data object to send along with the message
 */
Services.ping = (servicetype, parms, success, failure) => {
  const srv = new ImageTransport();
  const url = `https://${globalConfig.mobileOnExitUrl}${servicetype.path}${servicetype.url || ""}`;
  /* pragma:DEBUG_START */
  console.log("trigger: services ping: ", url);
  /* pragma:DEBUG_END */
  /**
   * Make the secure request using an image request
   */
  srv.send({
    url,
    success: success || (() => {}),
    failure: failure || (() => {}),
    data: parms,
  });
};

export { Services };
