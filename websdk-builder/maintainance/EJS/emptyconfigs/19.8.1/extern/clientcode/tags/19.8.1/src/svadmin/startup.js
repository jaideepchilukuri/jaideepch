/**
 * Startup sequence for Survey Admin
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

// When the DOM is ready, fire up the opt out script
fs.domReady(function() {
  /* pragma:DEBUG_START */
  console.log(
    'sva: domready for survey admin "' + config.config.version + '" *******************************'
  );
  /* pragma:DEBUG_END */

  // Set up the browser
  var browser = new utils.Browser();

  // Bind to browser ready
  browser.ready.subscribe(
    function() {
      /* pragma:DEBUG_START */
      console.log("sva: browser detected", browser);
      /* pragma:DEBUG_END */

      // Set up a new admin instance
      var admin = new Admin(browser);

      // Pull down the template and stylesheet
      admin.loadResources(
        function() {
          /* pragma:DEBUG_START */
          console.log("sva: loaded resources");
          /* pragma:DEBUG_END */
          // Display
          admin.render();
        }.bind(this)
      );
    },
    true,
    true
  );
});
