/**
 * Feedback Mod Config.
 * These are settings that don't make sense for customers to change,
 * but would be useful for Support/Implementation Services/TAMs to change.
 */
module.exports = {
  /**
   * Use this as a last resort to add a <style> tag to the head with
   * the contents of this string inserted into it.
   * If you need to do this, you should open a ticket to have a proper
   * setting added to this file for what you need to do, and only use
   * this setting while that ticket is being worked on. This will make
   * sure it is maintained release-to-release and doesn't break.
   */
  temporaryCssHack: "",

  /**
   * Make sure not to add `fsfb fsfb-relbody` as classes to the html element.
   * fsfb-relbody adds `position: relative !important` to the CSS for
   * the body which can mess up the position of other modal windows.
   */
  noPositionRelativeBody: false,

  /**
   * Add `overflow-y: scroll` to modal survey container to make it scroll
   * when necessary.
   */
  overflowScroll: false,

  /**
   * If running in an iframe, prevent feedback from loading.
   */
  skipIFrames: false,
};
