/**
 * Setup code for trigger. This gets used in startup, but it's here
 * so that it's modular and re-usable
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { Trigger } from "./trigger";

/**
 * Trigger setup routine
 * @param stg
 * @param config
 * @param browser
 * @param crit
 * @param cpps
 * @param ckie
 * @param events
 * @returns {Trigger}
 * @constructor
 */
const TriggerSetup = (stg, config, browser, crit, cpps, jrny) => {
  // OK, now we're ready to set up a trigger instance
  const trig = new Trigger(stg, config, browser, crit, cpps, jrny);

  // Return the trigger class
  return trig;
};

export { TriggerSetup };
