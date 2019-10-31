import { Promise, isArray, getNested, globalConfig } from "../fs/index";

// This will make a copy of this function here on purpose.
// The compress library doesn't have access to the fs library
// because the record webworker can't import it, so it's easier
// just to make a copy in both libraries
import { encodeUtf8 } from "../compress/encoding";

/**
 * Takes a configurable location to find the integrity hash
 * list from the globalConfig, and checks that the config.json
 * text matches this integrity hash. This is similar to
 * Sub-Resource Integrity and in fact uses the same format
 * for integrity hashes. The list of hashes is intended to be
 * stored in a tag manager or CMS to make it easy to update without
 * a deploy. The hashes must be stored on their servers somehow.
 *
 * This is here so that security conscious clients can make sure
 * that the config.json hasn't been modified in transit somehow,
 * and also gives them awareness of config changes since they need
 * to update the list of hashes in their CMS/tag manager.
 *
 * This takes an array of hashes so that a proposed future config.json
 * hash can be added to the list before it's deployed and there will
 * be no outage. So basically a rolling deploy. After the new config.json
 * is deployed, the hash for the previous one can be removed.
 *
 * @param {String} text  a string of the config.json body
 */
function checkIntegrity(text) {
  const location = globalConfig.integrityHashLocation;
  if (!location) {
    // feature is disabled, always pass the check
    return Promise.resolve(true);
  }

  const _crypto = window.crypto || window.msCrypto || {}; // for IE 11
  const subtle = _crypto.subtle || _crypto.webkitSubtle; // for Safari

  if (!subtle) {
    if (document.location.protocol !== "https:" && _crypto) {
      console.warn(
        "Foresee WebSDK skipping integrity code check because page not loaded over HTTPS."
      );
    }
    // pass silently if the browser doesn't support WebCrypto
    return Promise.resolve(true);
  }

  const conf = getNested(window, location);
  let hashes = conf.obj[conf.key];

  if (!isArray(hashes)) {
    hashes = [hashes];
  }

  // collect a list of algorithms to compute hashes for
  const algos = new Set();
  hashes.forEach(h => {
    algos.add(h.split("-")[0]);
  });

  // collect promises for all the algorithms in use
  const promises = [];
  algos.forEach(algo => {
    promises.push(hashText(subtle, algo, text));
  });

  // return a promise that resolves to true or false
  return Promise.all(promises).then(results => {
    for (let i = 0; i < hashes.length; i++) {
      for (let j = 0; j < results.length; j++) {
        if (results[j] === hashes[i]) return true;
      }
    }

    return false;
  });
}

/**
 * Return a promise of a hash of the text using the specified algorithm.
 * Supports standards compliant browsers, Safari and IE 11.
 */
function hashText(subtle, algo, text) {
  const wcAlgo = algo.toUpperCase().replace(/(\d)/, "-$1");
  const typedarray = encodeUtf8(text);
  let promise = subtle.digest(wcAlgo, typedarray);

  if (!promise.then) {
    // IE 11 doesn't have promises, so they return a CryptoOperation
    // that uses oncomplete/onerror events instead
    const cryptoOperation = promise;
    promise = new Promise((resolve, reject) => {
      cryptoOperation.oncomplete = () => resolve(cryptoOperation.result);
      cryptoOperation.onerror = () => reject(new Error("hash failed!"));
    });
  }

  // convert to base64 SRI format
  return promise.then(res => {
    const bytes = new Uint8Array(res);
    let hash = "";
    for (let i = 0; i < bytes.length; i++) {
      hash += String.fromCharCode(bytes[i]);
    }
    hash = btoa(hash);
    return `${algo}-${hash}`;
  });
}

export { checkIntegrity };
