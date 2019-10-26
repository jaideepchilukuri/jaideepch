/**
 * Module for preloading assets.
 *
 * (c) Copyright 2018 ForeSee, Inc.
 */

import { EventInfo } from "./eventinfo";
import { FSEvent } from "../../utils/utils";

// ES6 methods are safe to use in replay
/* eslint-disable es5/no-es6-methods, es5/no-es6-static-methods */

const PRELOAD_TIMEOUT = 180000;

/**
 * This class searches the virtual dom, the event list,
 * and recursively through any CSS for asset urls, then
 * uses `<link rel="preload">` tags to preload them all.
 */
class AssetPreloader {
  constructor() {
    this.onProgress = new FSEvent();
    this.failedCSSLoad = false;
  }

  /**
   * Preload all assets found in the list of pageData objects for
   * all pages. This searches the initial dom, recursively downloads
   * and searches CSS, and checks the event stream for added attributes
   * or DOM nodes with assets in them. It then downloads them all,
   * updating the onProgress event on the progress.
   */
  preloadAll(dataList) {
    const startedAt = Date.now();
    console.log("Starting asset preload...");

    // gather list of all assets (so far known)
    let assetList = [];
    dataList.forEach(data => {
      assetList = assetList.concat(this.domScan(data.initialDOM, data.events));
    });

    // remove duplicates
    const dupes = new Set();
    assetList = assetList.filter(asset => {
      if (dupes.has(asset.url)) {
        return false;
      }
      dupes.add(asset.url);
      return true;
    });

    const cssAssets = this.dedupeList(assetList.filter(this.isStylesheet)).filter(
      this.hasNoDeviceMediaQuery
    );

    return this.fetchCSS(cssAssets, assetList).then(() => {
      assetList = this.dedupeList(assetList);
      // now have a complete list of de-duped assets
      console.log("Complete asset list:", assetList);

      // we don't want to touch any of the css-urls though
      // this is because they *could* be inside a @media query
      // and therefore could cause problems if they block by user agent
      assetList = assetList.filter(
        asset => asset.key !== "css-url" && this.hasNoDeviceMediaQuery(asset)
      );

      console.log("Preloading", assetList.length, "assets:", assetList);

      return this.addPreloadLinks(assetList).then(() => {
        console.log("Asset preload finished in", Date.now() - startedAt, "ms");
        this.onProgress.unsubscribeAll();
      });
    });
  }

  /**
   * Recursively fetch CSS assets & pull their assets
   * @private
   */
  fetchCSS(cssAssets, assetList) {
    console.log(`Fetching ${cssAssets.length} css assets...`);
    return Promise.all(
      cssAssets.map(asset =>
        fetch(asset.url, {
          cache: "force-cache",
        }).then(res => {
          if (!res.ok) {
            if (!asset.failed) {
              this.failedCSSLoad = true;
              console.error(
                `FATAL: stylesheet preload failed: ${AssetPreloader.originalUrl(asset.url)}`,
                asset
              );
            }
            return null;
          }
          return res.text().then(text => {
            let newAssets = [];
            this.cssScan(text, newAssets, "css-url");
            newAssets = newAssets.filter(asset => {
              if (assetList.indexOf(asset) < 0) {
                assetList.push(asset);
                return true;
              }
              return false;
            });
            const newCSSAssets = newAssets.filter(asset => asset.key === "@import");
            if (newCSSAssets.length > 0) {
              // recurse down imports
              return this.fetchCSS(newCSSAssets, assetList);
            }
          });
        })
      )
    );
  }

  /**
   * Generate the actual link tags to preload everything and wait
   * until they load, error or timeout.
   * @private
   */
  addPreloadLinks(assets) {
    if (!assets || !assets.length) return Promise.resolve();

    return new Promise(resolve => {
      let remainingCount = assets.length;

      assets.forEach(asset => {
        let kind;
        if (this.isStylesheet(asset)) {
          kind = "style";
        } else if (this.isImage(asset)) {
          kind = "image";
        } else if (asset.key === "@font-face") {
          kind = "font";
        }
        if (!kind) {
          // can't figure out what this is
          if (asset.key !== "href" || !asset.node || asset.node.n !== "LINK") {
            console.warn("Unable to determine type of this asset so not preloading it:", asset);
          }
          remainingCount--;
          return;
        }

        const el = document.createElement("link");
        // eslint-disable-next-line prefer-const
        let done;
        const timeout = setTimeout(() => {
          console.error(
            `FATAL Timed out preloading: ${AssetPreloader.originalUrl(asset.url)}`,
            asset
          );
          done();
        }, PRELOAD_TIMEOUT);
        const error = () => {
          if (!this.isImage(asset)) {
            // don't report imgs
            console.error(`Error preloading: ${AssetPreloader.originalUrl(asset.url)}`, asset);
          } else if (asset.key !== "css-url") {
            // don't report bad css assets
            console.warn(`Unable to preload: ${AssetPreloader.originalUrl(asset.url)}`, asset);
          }
          done();
        };
        done = () => {
          el.removeEventListener("load", done, false);
          el.removeEventListener("error", error, false);
          clearTimeout(timeout);

          remainingCount--;
          this.onProgress.fire(((assets.length - remainingCount) * 100) / assets.length);
          if (remainingCount <= 0) {
            // all done
            resolve();
          }
        };

        el.addEventListener("load", done, false);
        el.addEventListener("error", error, false);

        el.setAttribute("rel", "preload");

        if (kind === "font") {
          // fix warning for fonts being loaded
          el.setAttribute("crossorigin", "anonymous");
        }

        // helps the browser prioritize the order of download
        el.setAttribute("as", kind);

        el.setAttribute("href", asset.url);

        document.head.appendChild(el);
      });
    });
  }

  /**
   * Search through CSS for @font-face, @import and other urls
   * @private
   */
  cssScan(text, list, urlType) {
    const matches = text.match(/url\s*\(\s*['"]?\/replay\/proxy\?[^)]+\)/g) || [];
    let urls = matches.map(
      url => `/replay/proxy${url.split("/replay/proxy")[1].replace(/['"]?\s*\)$/, "")}`
    );

    const atImports = text.match(/@import\s*[^;]+;/g) || [];
    atImports.forEach(imp => {
      const match = imp.match(/(\/replay\/proxy\?[^"')]+)["')]/);
      if (!match) return;
      const url = match[1];
      urls = urls.filter(u => u !== url);
      list.push({
        url,
        key: "@import",
      });
    });

    const fonts = text.match(/@font-face\s*{[^}]+}/g) || [];
    fonts.forEach(font => {
      const fontUrls = (font.match(/url\s*\(\s*['"]?\/replay\/proxy\?[^)]+\)/g) || []).map(
        url => `/replay/proxy${url.split("/replay/proxy")[1].replace(/['"]?\s*\)$/, "")}`
      );
      urls = urls.filter(u => fontUrls.indexOf(u) < 0);

      // first try to use a the first woff2, woff or truetype font found
      let fontUrl = font.match(
        /url\s*\(\s*['"]?(\/replay\/proxy\?[^)'"]+)['"]?\s*\)\s*format\(['"](woff2|woff|truetype)['"]\)/
      );

      // failing all of those, use the first listed url
      if (!fontUrl) {
        fontUrl = [0, fontUrls[0]];
      }

      if (fontUrl[1]) {
        list.push({
          url: fontUrl[1],
          key: "@font-face",
        });
      }
    });

    urls.forEach(url => {
      list.push({
        url,
        key: urlType,
      });
    });
  }

  /**
   * Scan the initial dom and its events for assets.
   * @private
   */
  domScan(initialDOM, events) {
    const that = this;
    function search(node, list) {
      if (node.a) {
        for (const key in node.a) {
          if (
            node.a[key] &&
            typeof node.a[key] === "string" &&
            node.a[key].indexOf("/replay/proxy?") === 0
          ) {
            list.push({
              url: node.a[key],
              key,
              node,
            });
          }
        }
        if (node.a.style) {
          that.cssScan(node.a.style, list, "style-url");
        }
      }
      if (node.n === "STYLE" && node.c) {
        const text = node.c.map(txt => txt.v || "").join("");
        that.cssScan(text, list, that.hasNoDeviceMediaQuery(node) ? "css-url" : "style-url");
      }
      if (node.c) {
        for (let i = 0; i < node.c.length; i++) {
          search(node.c[i], list);
        }
      }
    }

    const assetNodes = [];
    if (initialDOM) {
      search(initialDOM, assetNodes);
    }

    events.forEach(event => {
      if (event.e === EventInfo.PAGE_MARKER && event.d.doc) {
        search(event.d.doc, assetNodes);
      } else if (event.e === EventInfo.DOM_MODIFICATIONS) {
        for (let j = 0; j < event.d.length; j++) {
          const mod = event.d[j];
          if (mod.e === EventInfo.NODE_ADDED) {
            search(mod.d.tree, assetNodes);
          } else if (mod.e === EventInfo.ATTR_MODIFIED) {
            if (mod.d.attr === "style" && mod.d.val) {
              this.cssScan(mod.d.val, assetNodes, "style-url");
            } else if (mod.d.val && mod.d.val.indexOf("/replay/proxy?") === 0) {
              const attrs = {};
              if (mod.d.r) {
                attrs.rel = mod.d.r;
              }
              attrs[mod.d.attr] = mod.d.val;
              assetNodes.push({
                url: mod.d.val,
                key: mod.d.attr,
                node: { id: mod.d.id, n: mod.d.tn, a: attrs },
              });
            }
          }
        }
      } else if (event.e === EventInfo.ASSET_ERROR) {
        if (event.d.a) {
          const url = event.d.a.src || event.d.a.href || event.d.a.srcset;
          const burl = encodeURIComponent(btoa(url));
          assetNodes.forEach(d => {
            if (d.url.indexOf(burl) > -1 || d.url.indexOf(url) > -1) {
              d.failed = true;
            }
          });
        }
      }
    });
    return assetNodes;
  }

  /**
   * De-duplicate the asset list
   * @private
   */
  dedupeList(list) {
    // remove duplicates
    const dupes = new Set();
    return list.filter(asset => {
      if (dupes.has(asset.url)) {
        return false;
      }
      dupes.add(asset.url);
      return true;
    });
  }

  /**
   * Is asset a stylesheet?
   * @private
   */
  isStylesheet(asset) {
    return (
      asset.key === "@import" ||
      (asset.key === "href" &&
        asset.node.n === "LINK" &&
        asset.node.a &&
        asset.node.a.rel === "stylesheet")
    );
  }

  /**
   * Is it an image?
   * @private
   */
  isImage(asset) {
    return (
      asset.key === "css-url" ||
      asset.key === "style-url" ||
      (asset.key === "src" && asset.node.n === "IMG") ||
      (asset.key === "srcset" && asset.node.n === "SOURCE") ||
      (asset.key === "src" && asset.node.n === "INPUT") ||
      (asset.key === "src" && !asset.node.n)
    );
  }

  /**
   * Does it have a media attribute?
   * @private
   */
  hasNoDeviceMediaQuery(asset) {
    const node = asset.node;
    if (!node) {
      return true;
    }
    if (!node.a) {
      return true;
    }
    if (!node.a.media) {
      return true;
    }
    const media = node.a.media;
    // only care if the media query is selecting whether it's a mobile
    // or desktop device... in that case, it's unsafe to preload it
    return media.indexOf("width") < 0 && media.indexOf("height") < 0;
  }

  /**
   * Gets the absolute original url from a proxy url.
   * This should only be used for debugging since it is server
   * implementation dependant.
   */
  static originalUrl(proxyUrl) {
    try {
      const query = proxyUrl.split("?")[1];
      const paramStrs = query.split("&");
      const encUri = paramStrs.find(s => s.indexOf("url=") === 0).split("=")[1];
      const encBase = paramStrs.find(s => s.indexOf("context=") === 0).split("=")[1];
      const uri = atob(decodeURIComponent(encUri));
      const base = atob(decodeURIComponent(encBase));
      const url = new URL(uri, base);
      return url.href;
    } catch (e) {
      return proxyUrl;
    }
  }
}

export { AssetPreloader };
