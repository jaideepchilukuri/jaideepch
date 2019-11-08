/**
 * Makes a guid
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { getParam } from "../../fs/index";
import { APPID } from "../top";
import { Journey } from "./journey";

let __sentAlready;

const initBehavioralData = (customerId, stg, browser, cpps) => {
  let key;

  // this needs to only be sent once per page load.
  // note that FSR.run() and history.pushState needs to be supported.
  if (__sentAlready === location.href) return;
  __sentAlready = location.href;

  const journey = new Journey({
    customerId,
    appId: APPID.BEHAVIOR,
    stg,
    browser,
    throttleDuration: 0,
    useSessionId: true,
    usePopupId: false,
  });

  const props = {
    fs_pageUrl: [location.href],
    fs_referrer: [document.referrer],
    fs_utmSource: [getParam("utm_source")],
    fs_utmMedium: [getParam("utm_medium")],
    fs_utmCampaign: [getParam("utm_campaign")],
    fs_utmTerm: [getParam("utm_term")],
    fs_utmContent: [getParam("utm_content")],
  };

  // remove null props
  for (key in props) {
    if (!props[key][0]) {
      delete props[key];
    }
  }

  const desc =
    document.querySelector('meta[name="description"]') ||
    document.querySelector('meta[property="og:description"]') ||
    document.querySelector('meta[name="og:description"]');
  const data = {
    fs_ga_uid: cpps.get("GA_UID"),
    fs_adobe_uid: cpps.get("OMTR_MCID"),
    fs_pageTitle: String(document.title),
    fs_pageDescription: desc && String(desc.getAttribute("content")),
  };

  // remove null data
  for (key in data) {
    if (!data[key]) {
      delete data[key];
    }
  }

  journey.addEvent({
    name: "fs_pageView",
    properties: props,
    data,
  });
};

export { initBehavioralData };
