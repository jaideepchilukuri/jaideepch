/**
 * Preview Controller
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

fs.provide("fs.Preview");

fs.require("fs.Top");
fs.require("fs.Dom.MiniDOM");
fs.require("fs.Loader");
fs.require("fs.GlobalLoader");

(function () {

  /**
   * A popup
   * @param cfg
   */
  var Preview = function (browser) {
    this.br = browser;
    this.mid = utils.getHashParm('mid');
    this.previewmode = fs.toLowerCase(utils.getHashParm('previewmode'));
    this.datauri = utils.getHashParm('datauri');
    this.template = utils.getHashParm('template') || 'default';
    this.surveytype = utils.getHashParm('surveytype') ? utils.getHashParm('surveytype') : 'modal';
    this.tempHolder = {};
  };

  /**
   * Show the preview
   */
  Preview.prototype.show = function () {
    if (this.mid && this.previewmode && this.datauri) {
      /* pragma:DEBUG_START */
      console.warn("fb: rendering survey for preview..");
      /* pragma:DEBUG_END */
      var gl = new GlobalLoader(this.br, {}, [this.template]);
      gl.loadSuccess.subscribe(function(tmp) {
        this.tempHolder = tmp[this.template];
        /* pragma:DEBUG_START */
        console.warn("fb: showing desktop survey");
        /* pragma:DEBUG_END */
        var pu = PopupHandler.initialize({
            mid: this.mid,
            datauri: this.datauri,
            posturi: "",
            reporturi: "",
            surveytype: this.surveytype,
            autowhitelist: true,
            preview: true,
            template: this.template,
            replay: false
          },
          this.br,
          null,
          this.tempHolder.emTemplate,
          this.tempHolder.svContentsTemplate,
          this.tempHolder.epTemplate
        );
        // pu.show();
      }.bind(this));

      gl.loadFailure.subscribe(function() {
        /* pragma:DEBUG_START */
        console.warn("fb: rendering survey failed..");
        /* pragma:DEBUG_END */
      }.bind(this));
    } else {
      /* pragma:DEBUG_START */
      console.warn("fb: missing either mid, previewmode, or datauri");
      /* pragma:DEBUG_END */
      alert('You need mid, previewmode, and datauri.');
    }
  };

})();