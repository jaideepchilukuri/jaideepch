/**
 * Some very basic plumbing. This file should appear at the top of the stack.
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

/**
 * Quickreference the window
 */
const _W = window;

/**
 * The main utils object
 * @type {{}}
 */
const APPID = {
  TRIGGER: "funcxm",
  FEEDBACK: "funfbk",
  REPLAY: "funrep",
  BEHAVIOR: "fs_behavioral_data",
};

const Singletons = {
  StorageInstances: {},
};

export { Singletons, _W, APPID };
