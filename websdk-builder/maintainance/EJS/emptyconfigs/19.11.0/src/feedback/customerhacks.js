/**
 * Customer hack area
 *
 * DO NOT ADD MORE CUSTOMERS TO THIS FILE:
 * Use the fbmods config file instead!
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { toLowerCase, getProductConfig } from "../fs/index";

const ACS_OVERRIDES = {};

let alreadyHackedCss = false;

function applyFeedbackCustomerHacks() {
  const mods = getProductConfig("fbmods") || {};

  // Where customer hacks can go
  const wl = toLowerCase(window.location.href.toString());

  // Do not add `fsfb fsfb-relbody` to body classes
  if (
    mods.noPositionRelativeBody ||
    wl.indexOf("buildabear.c") > -1 ||
    wl.indexOf("bab-dev-store.sparkred.") > -1 ||
    wl.indexOf("humana.c") > -1 ||
    wl.indexOf(".dteenergy.c") > -1 ||
    wl.indexOf(".mcdonalds.") > -1
  ) {
    ACS_OVERRIDES.FBALTPOSITION = true;
  }

  // peco.com, bge.com, comed.com enforce overflow hidden on the body tag.
  if (
    mods.overflowScroll ||
    wl.indexOf(".peco.c") > -1 ||
    wl.indexOf(".bge.com") > -1 ||
    wl.indexOf(".comed.com") > -1
  ) {
    ACS_OVERRIDES.FBALTOVERFLOW = true;
  }

  // Bomb out on argos iFrames
  if (mods.skipIFrames || wl.indexOf("argos.co") > -1) {
    if (window !== window.top) {
      // in an iframe
      return false;
    }
  }

  // allow for an escape hatch where any arbitrary CSS can be put
  // in a style tag on the page temporarily while it's implemented
  // properly
  if (mods.temporaryCssHack && !alreadyHackedCss) {
    alreadyHackedCss = true;

    const style = document.createElement("style");
    style.innerHTML = `\n/* ForSee Feedback CSS Styles */\n${mods.temporaryCssHack}`;
    document.head.append(style);
  }

  return true;
}

export { ACS_OVERRIDES, applyFeedbackCustomerHacks };
