/**
 * Fixes some CPPS
 *
 * (c) Copyright 2017 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { globalConfig } from "../fs/index";

/**
 * Fix some CPPS
 */
const FixCPPS = stg => {
  if (stg._data.keys && stg._data.keys.cp) {
    delete stg._data.keys.cp.v.trigger_version;
    stg._data.keys.cp.v.code = globalConfig.codeVer;
  }
};

export { FixCPPS };
