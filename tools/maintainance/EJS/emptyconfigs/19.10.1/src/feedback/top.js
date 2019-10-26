/**
 * Top file for feedback
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { FSEvent } from "../utils/utils";

/**
 * Holds singletons
 * @type {{}}
 */
const Singletons = {
  onFeedbackSubmitted: new FSEvent(),
  onFeedbackShown: new FSEvent(),
  onFeedbackClosed: new FSEvent(),
  onModalCssRetrieved: new FSEvent(),
};

export { Singletons };
