/**
 * Makes a guid
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.Utils.BehavioralData");

fs.require("fs.Top");

(function (utils) {
  var __sentAlready;

  utils.initBehavioralData = function (customerId, stg, browser, cpps) {
    // this needs to only be sent once per page load.
    // note that FSR.run() and history.pushState needs to be supported.
    if (__sentAlready === location.href) return;
    __sentAlready = location.href;

    var journey = new utils.Journey(
      customerId,
      utils.APPID.BEHAVIOR,
      stg,
      browser,
      0
    );

    var props = {
      fs_pageUrl: [location.href],
      fs_referrer: [document.referrer],
      fs_utmSource: [fs.getParam("utm_source")],
      fs_utmMedium: [fs.getParam("utm_medium")],
      fs_utmCampaign: [fs.getParam("utm_campaign")],
      fs_utmTerm: [fs.getParam("utm_term")],
      fs_utmContent: [fs.getParam("utm_content")],
    };

    // remove null props
    for (var key in props) {
      if (!props[key][0]) {
        delete props[key];
      }
    }

    var desc = document.querySelector('meta[name="description"]') ||
      document.querySelector('meta[property="og:description"]') ||
      document.querySelector('meta[name="og:description"]');
    var data = {
      fs_ga_uid: cpps.get("GA_UID"),
      fs_adobe_uid: cpps.get("OMTR_MCID"),
      fs_pageTitle: document.title,
      fs_pageDescription: desc && desc.getAttribute("content"),
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
      data: data
    });
  };

})(utils);