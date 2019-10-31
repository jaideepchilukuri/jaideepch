/**
 * Sets up the integrations namespace
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { OM } from "./adobe";
import { GA } from "./ga";

// Expose it
const INT = {
  GA,
  OM,
};

export { INT };
