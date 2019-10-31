﻿/**
 * The CSS for the UI portions of the replay player.
 *
 * (c) Copyright 2018 ForeSee Results, Inc.
 */

// todo
// This has to be moved in a SASS file. As of now, there is only JS
// in Client Code repository. As soon as Client Code, Client Code Template
// and Gateway are merged in a monorepo, it will make sense to make this
// CSS be part of a SASS pipeline.

fs.provide("rp.Replay.Playback.UI.css");

fs.require("rp.Top");

(function () {
  var UICSS = {
    playbackFrameBorder: 2,
    overlayShadeFadeTime: 333,
    overlayShadeSkipTime: 1500
  };

  UICSS.pathFSLogo = fs.makeAssetURI("/fslogo.svg");

  UICSS.data = [
    "body {",
    "  background-color: #777;",
    "  padding: 0;",
    "  margin: 0;",
    "  width: 100%;",
    "  height: 100vh;",
    "  display: flex;",
    "  justify-content: center;",
    "  align-items: center;",
    "  overflow: hidden;",
    "}",
    "",
    "/************",
    " * iframe",
    " ************/",
    "",
    "iframe#playback {",
    "  border: ", UICSS.playbackFrameBorder + "px solid #333;",
    "  background-color: #fff;",
    "  box-shadow: 10px 10px 10px #555;",
    "}",
    "",
    "/************",
    " * UI",
    " ************/",
    "",
    ".overlay {",
    "  z-index: 901;",
    "  position: absolute;",
    "}",
    "",
    ".overlay>div * {",
    "  transition: opacity ", Math.round(UICSS.overlayShadeFadeTime) + "ms ease-in;",
    "}",
    "",
    ".overlay .hidden {",
    "  opacity: 0;",
    "}",
    "",
    ".overlay .center {",
    "  position: absolute;",
    "  top: 50%;",
    "  left: 50%;",
    "  transform: translate(-50%, -50%);",
    "}",
    "",
    "#shade {",
    "  width: 100%;",
    "  height: 100%;",
    "  background-image: url('" + UICSS.pathFSLogo + "');",
    "  background-color: #fff;",
    "  background-repeat: no-repeat;",
    "  background-position: 50% 50%;",
    "  background-size: 30%;",
    "  filter: grayscale(1) brightness(2.5) invert(1);",
    "}",
    "",
    "#shade.pageEnd {",
    "  filter: grayscale(1) brightness(2.5);",
    "}",
    "",
    "#counter {",
    "  width: 100%;",
    "  height: 100%;",
    "  background-color: #000d;",
    "  color: #fff;",
    "}",
    "",
    "#counter #graph {",
    "  position: absolute;",
    "  width: 16em;",
    "  top: 50%;",
    "  left: 50%;",
    "  transform: translate(-50%, -50%);",
    "  z-index: -1;",
    "}",
    "",
    "#counter #graph circle#c {",
    "  stroke: #7db1ef95;",
    "  cx: 0.5;",
    "  cy: 0.5;",
    "  r: 0.25;",
    "  fill: none;",
    "  stroke-width: 0.5px;",
    "  stroke-dashoffset: 1.57;",
    "  transition: stroke-dashoffset ", Math.round(UICSS.overlayShadeSkipTime) + "ms linear;",
    "  stroke-dasharray: 1.57;",
    "  transform: translate(0%, 100%) rotate(-90deg);",
    "}",
    "",
    "#counter #caption{",
    "  position: absolute;",
    "  top: 50%;",
    "  left: 50%;",
    "  transform: translate(-50%, -50%);",
    "  z-index: -1;",
    "  font-family: \"Helvetica Neue\", \"Liberation Sans\", sans-serif;",
    "  font-size: 32pt;",
    "}",
  ].join("\n");
})();
