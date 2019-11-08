/**
 * Preview Controller
 *
 * (c) Copyright 2015 ForeSee, Inc.
 *
 * @author Alexei White (alexei.white@foresee.com)
 * @author Alexei White: alexei.white $
 *
 */

import { toLowerCase } from "../fs/index";
import { getHashParm } from "../utils/utils";
import { GlobalLoader } from "./globalloader";
import { PopupHandler } from "./popuphandler";

/**
 * A popup
 * @param cfg
 */
class Preview {
  constructor(browser) {
    this.br = browser;
    this.mid = getHashParm("mid");
    this.previewmode = toLowerCase(getHashParm("previewmode"));
    this.datauri = getHashParm("datauri");
    this.template = getHashParm("template") || "default";
    this.surveytype = getHashParm("surveytype") ? getHashParm("surveytype") : "modal";
    this.tempHolder = {};
  }

  /**
   * Show the preview
   */
  show() {
    if (this.mid && this.previewmode && this.datauri) {
      /* pragma:DEBUG_START */
      console.warn("fb: rendering survey for preview..");
      /* pragma:DEBUG_END */
      const gl = new GlobalLoader(this.br, {}, [this.template]);
      gl.loadSuccess.subscribe(tmp => {
        this.tempHolder = tmp[this.template];
        /* pragma:DEBUG_START */
        console.warn("fb: showing desktop survey");
        /* pragma:DEBUG_END */
        PopupHandler.initialize(
          {
            mid: this.mid,
            datauri: this.datauri,
            posturi: "",
            reporturi: "",
            surveytype: this.surveytype,
            autowhitelist: true,
            preview: true,
            template: this.template,
            replay: false,
          },
          this.br,
          null,
          this.tempHolder.emTemplate,
          this.tempHolder.svContentsTemplate,
          this.tempHolder.epTemplate
        );
        // pu.show();
      });

      gl.loadFailure.subscribe(() => {
        /* pragma:DEBUG_START */
        console.warn("fb: rendering survey failed..");
        /* pragma:DEBUG_END */
      });
    } else {
      /* pragma:DEBUG_START */
      console.warn("fb: missing either mid, previewmode, or datauri");
      /* pragma:DEBUG_END */
      throw new Error("You need mid, previewmode, and datauri.");
    }
  }
}

export { Preview };
