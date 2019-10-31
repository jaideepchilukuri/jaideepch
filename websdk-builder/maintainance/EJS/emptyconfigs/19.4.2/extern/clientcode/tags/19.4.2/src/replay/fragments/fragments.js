/**
 * SessionReplay Fragments
 *
 * This namespace holds all things related to DOM Fragments
 *
 * (c) Copyright 2011 Foresee, Inc.
 *
 * @author Alexei White (alexei.white@foreseeresults.com)
 * @author $Author: alexei.white $
 *
 * @modified $Date: 2011-08-26 07:54:30 -0700 (Fri, 26 Aug 2011) $
 * @version $Revision: 7257 $

 * Created: May. 2, 2011
 */

fs.provide("rp.Replay.Fragments");

fs.require("rp.Top");

(function () {

  /**
   * @class Holds the fragments namespace.
   * @static
   */
  Replay.Fragments = {

    /**
     * Holds all the DOM fragments by their GUIDs
     */
    domFragments: {},

    /**
     * The set of fragments being loaded.
     */
    _fragmentsBeingLoaded: [],

    /**
     * Add a fragment to the list
     * @param fragment
     */
    addFragment: function (fragment) {
      this.domFragments[fragment.guid] = fragment;
    },

    /**
     * Pull the fragments out of the event stream
     */
    addFragmentsFromEventStream: function (stream) {
      for (var i = 0; i < stream.length; i++) {
        if (stream[i].domFragment && stream[i].domFragment.guid) {
          this.addFragment(stream[i].domFragment);
        }
      }
    },

    /**
     * Get the next fragment
     */
    _getNextFragment: function () {
      for (var frag in this.domFragments) {
        if (!this.domFragments[frag].requested) {
          this.domFragments[frag].requested = true;
          return this.domFragments[frag];
        }
      }
    },

    /**
     * Preload all the fragments
     */
    preloadFragments: function (callback) {
      // Set the completion callback
      this._preloadCompleteCallback = callback;

      // start downloading fragments
      this._retrieveNextFragmentBlock();
    },

    /**
     * Check if we've loaded everything yet
     */
    _checkFirePreloadCompletionEvent: function () {
      for (var frag in this.domFragments) {
        if (!fs.isDefined(this.domFragments[frag].fragment)) {
          return false;
        }
      }
      // we're done!
      return true;
    },

    /**
     * Retrieve a fragment from the server
     * @param fragment
     * @param callback
     */
    _retrieveNextFragmentBlock: function () {
      var i;

      // First remove completed ones
      for (i = 0; i < this._fragmentsBeingLoaded.length; i++) {
        if (!this._fragmentsBeingLoaded[i].fragment) {
          this._fragmentsBeingLoaded.splice(i, 1);
          i--;
        }
      }

      // Now fill in the gaps
      for (i = this._fragmentsBeingLoaded.length; i < 7; i++) {
        var nextFrag = this._getNextFragment();
        if (nextFrag) {
          this._fragmentsBeingLoaded[this._fragmentsBeingLoaded.length] = nextFrag;
          var transport = new utils.AjaxTransport({
            url: '/replay/proxy?guid=' + nextFrag.guid,
            failure: function () {
            },
            success: function (ctx, frag) {
              return function (html) {
                ctx.domFragments[frag].fragment = html;
                ctx._retrieveNextFragmentBlock();
              };
            }(this, nextFrag.guid)
          });
          transport.send();
        } else {
          if (this._checkFirePreloadCompletionEvent()) {
            // Fire the event
            if (this._preloadCompleteCallback)
              this._preloadCompleteCallback.apply(this);
            break;
          }
        }
      }
    }
  };

})();