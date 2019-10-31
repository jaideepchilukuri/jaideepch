/**
 * Customer hack area
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { toLowerCase } from "../fs/index";

const ACS_OVERRIDES = {};

function applyFeedbackCustomerHacks() {
  // Where customer hacks can go
  const wl = toLowerCase(window.location.href.toString());
  const ACS_OVERRIDES = {};

  // Build a bear's prod and staging envs.
  if (
    wl.indexOf("buildabear.c") > -1 ||
    wl.indexOf("bab-dev-store.sparkred.") > -1 ||
    wl.indexOf("humana.c") > -1 ||
    wl.indexOf(".dteenergy.c") > -1 ||
    wl.indexOf(".mcdonalds.") > -1
  ) {
    ACS_OVERRIDES.FBALTPOSITION = true;
  }

  // peco.com, bge.com, comed.com enforce overflow hidden on the body tag.
  if (wl.indexOf(".peco.c") > -1 || wl.indexOf(".bge.com") > -1 || wl.indexOf(".comed.com") > -1) {
    ACS_OVERRIDES.FBALTOVERFLOW = true;
  }

  // is this feedbackreport only?
  if (wl.indexOf("/serve/") > -1) {
    // AMEX
    ACS_OVERRIDES.FBALTSCROLL = true;
  }

  // Bomb out on argos iFrames
  if (wl.indexOf("argos.co") > -1 && window !== window.top) {
    return false;
  }

  return true;
}

export { ACS_OVERRIDES, applyFeedbackCustomerHacks };
