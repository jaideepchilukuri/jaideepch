/* eslint-env node */
// ES6 methods are safe to use in Node>=10
/* eslint-disable es5/no-es6-methods, es5/no-es6-static-methods */

const { exec } = require("child_process");
const chalk = require("chalk");
const fs = require("fs");
const request = require("request");
const uuidV4 = require("uuid");
const zlib = require("zlib");

const desktopUserAgent = [
  "Mozilla/5.0 ",
  "(Macintosh; Intel Mac OS X 10_13_5) ",
  "AppleWebKit/537.36 (KHTML, like Gecko) ",
  "Chrome/67.0.3396.99 Safari/537.36",
].join("");

const mobileUserAgent = [
  "Mozilla/5.0 ",
  "(Linux; Android 6.0; Nexus 5 Build/MRA58N) ",
  "AppleWebKit/537.36 (KHTML, like Gecko) ",
  "Chrome/67.0.3396.99 Mobile Safari/537.36",
].join("");

/**
 * Get a URL asynchronously
 */
const getAsync = function(useragent, url) {
  return new Promise((resolve, reject) => {
    const fname = `${uuidV4()
      .toString()
      .replace(/-/gi, "")
      .substr(0, 10)}.dat`;
    const _cmd = [
      "curl '",
      url,
      "' ",
      "-H 'Upgrade-Insecure-Requests: 1' ",
      `-H 'User-Agent: ${useragent}' `,
      "-H 'Accept: text/html,application/xhtml+xml,",
      "application/xml;q=0.9,image/webp,image/apng,*/*;q=0.8' ",
      "-H 'Accept-Encoding: gzip, deflate' ",
      "-H 'Accept-Language: en-US,en;q=0.9,fr;q=0.8' ",
      "-m 10 -L --retry 2 --retry-delay 1 -s ",
      `-o ${fname} -w '%{http_code}||%{content_type}' `,
      "--compressed",
    ];
    exec(_cmd.join(""), (err, stdout, stderr) => {
      if (err) {
        // node couldn't execute the command
        try {
          fs.unlinkSync(fname);
        } catch (e) {
          console.error(e);
        }
        return reject(Error("Timeout/connection problem"));
      }
      if (!stdout.length) {
        reject(Error(`Failed to download file: ${stderr}`));
        try {
          fs.unlinkSync(fname);
        } catch (e) {
          console.error(e);
        }
        return;
      }
      const status = stdout.split("||");
      const statusCode = parseInt(status[0], -1);
      let contentType = status[1];
      if (status.length !== 2) {
        reject(Error(`Bad stdout: ${stdout}`));
        try {
          fs.unlinkSync(fname);
        } catch (e) {
          console.error(e);
        }
        return;
      }
      if (statusCode !== 200) {
        reject(Error(`Bad status code: ${statusCode}`));
        try {
          fs.unlinkSync(fname);
        } catch (e) {
          console.error(e);
        }
        return;
      }

      if (contentType === "") {
        // try to recover this
        if (url.endsWith(".woff2")) {
          contentType = "application/font-woff2";
        } else if (url.endsWith(".woff")) {
          contentType = "application/font-woff";
        } else if (url.endsWith(".otf")) {
          contentType = "font/opentype";
        }
      }

      if (contentType.indexOf("/") < 0) {
        reject(Error(`No content type: ${stdout}`));
        try {
          fs.unlinkSync(fname);
        } catch (e) {
          console.error(e);
        }
        return;
      }

      const data = fs.readFileSync(fname);
      fs.unlinkSync(fname);

      resolve({
        contentType,
        statusCode,
        data,
      });
    });
  });
};

/**
 * Compress
 * @param {Buffer} buf
 */
const compressAsync = function(buf) {
  return new Promise((resolve, reject) => {
    zlib.deflate(buf, (err, buf2) => {
      if (err) {
        reject(err);
      } else {
        resolve(buf2);
      }
    });
  });
};

/**
 * Upload a file to node-api
 * @param {String} srvr
 * @param {Object} inf
 */
const postFileAsync = function(srvr, inf) {
  return new Promise((resolve, reject) => {
    const req = request.post(
      {
        url: `${srvr}/services/unreachables/${inf.id}`,
      },
      function(error) {
        if (error) {
          return reject(error);
        }
        resolve();
      }
    );
    const form = req.form();
    form.append("file", JSON.stringify(inf));
  });
};

/**
 * Delete a file from node api
 * @param {String} srvr
 * @param {Object} inf
 */
const delFileAsync = function(srvr, inf) {
  return new Promise((resolve, reject) => {
    request.delete(
      {
        url: `${srvr}/services/unreachables/${inf.id}`,
      },
      function(error) {
        if (error) {
          return reject(error);
        }
        resolve();
      }
    );
  });
};

const commonBadUrlPrefixes = [
  // these are not urls
  "blob:",
  "moz-extension:",

  // this one fails commonly and is very slow
  "https://gc.kis.v2.scr.kaspersky-labs.com/",
  "https://ie.kis.v2.scr.kaspersky-labs.com/",
  "https://ff.kis.v2.scr.kaspersky-labs.com/",

  // broken website
  "https://www.buffalowildwings.com/en/",
  "https://silhouette-production.s3.amazonaws.com/embroidery",
  "https://qaf.youravon.com/",
];

/* eslint-disable no-await-in-loop */
const handleUnreachablesBucketAsync = async function(bucket, srvr, unrchables) {
  for (let i = 0; i < unrchables.length; i++) {
    const unchr = unrchables[i];

    let skip = false;
    for (let j = 0; j < commonBadUrlPrefixes.length; j++) {
      const prefix = commonBadUrlPrefixes[j];
      if (unchr.url.startsWith(prefix)) {
        console.log(
          chalk.yellow(`[${bucket}: ${i + 1} / ${unrchables.length}] SKIPPED [${prefix}] `),
          unchr.url,
          chalk.yellow("for"),
          srvr
        );
        await delFileAsync(srvr, unchr);
        skip = true;
        break;
      }
    }
    if (skip) {
      continue;
    }

    let fileres;
    try {
      fileres = await getAsync(desktopUserAgent, unchr.url);
    } catch (e) {
      try {
        fileres = await getAsync(mobileUserAgent, unchr.url);
      } catch (ex) {
        console.log(
          chalk.red(`[${bucket}: ${i + 1} / ${unrchables.length}] FAILED [${ex}\n${e}] `),
          unchr.url,
          chalk.yellow("for"),
          srvr
        );
        await delFileAsync(srvr, unchr);
        continue;
      }
    }

    if (
      /<(body|html)[ >]/i.test(fileres.data) &&
      (fileres.contentType !== "text/html" ||
        /\.(gif|png|jpg|jpeg|woff|woff2|ttf|css|svg)\b/.test(unchr.url))
    ) {
      console.log(
        chalk.red(`[${bucket}: ${i + 1} / ${unrchables.length}] FAILED [got HTML] `),
        unchr.url,
        chalk.yellow("for"),
        srvr
      );
      await delFileAsync(srvr, unchr);
      continue;
    }

    /* eslint-disable require-atomic-updates */
    fileres.data = await compressAsync(fileres.data);
    console.log(
      chalk.green(
        `[${bucket}: ${i + 1} / ${unrchables.length}] SUCCESS [${fileres.statusCode}] ${
          fileres.contentType
        } (${fileres.data.length} bytes)`
      ),
      unchr.url,
      chalk.yellow("for"),
      srvr
    );
    fileres.data = fileres.data.toString("base64");
    unchr.file = fileres;
    await postFileAsync(srvr, unchr);
  }
};

let lastRunUrls = new Set();
let thisRunUrls = new Set();

/**
 * Handle all the unreachables from the server
 */
const handleUnreachablesAsync = async function(srvr) {
  /* eslint-disable no-process-env */
  process.env.NODE_TLS_REJECT_UNAUTHORIZED = "0";
  console.log(`Getting unreachables from ${srvr}`);
  let unrchables;
  try {
    unrchables = await getAsync(desktopUserAgent, `${srvr}/services/unreachables`);
  } catch (e) {
    console.error(chalk.red("Could not reach", chalk.bold(srvr)));
    throw e;
  }
  unrchables = JSON.parse(unrchables.data.toString());

  // filter out repeat offenders
  unrchables = unrchables.filter(unrch => {
    const key = `${unrch.global_session_id}-${unrch.session_id}-${unrch.url}`;
    thisRunUrls.add(key);
    return !lastRunUrls.has(key);
  });

  // we want to sort by hostname so that each different host is
  // done in parallel
  const hostBuckets = {};
  for (let i = 0; i < unrchables.length; i++) {
    const unchr = unrchables[i];
    const parts = unchr.url.split("/");
    const host = parts[2];
    hostBuckets[host] = hostBuckets[host] || [];
    hostBuckets[host].push(unchr);
  }

  // then we want to sort the hosts into maxBuckets different buckets
  // so we can do maxBuckets requests in parallel. We sort the hosts
  // by number of links so the first few buckets can fill up with the
  // big ones
  const hosts = Object.keys(hostBuckets).sort(function(a, b) {
    return hostBuckets[b].length - hostBuckets[a].length;
  });
  const buckets = [];
  const maxBuckets = 10;
  for (let i = 0; hosts.length > 0; i++) {
    const host = hosts[0];

    buckets[i % maxBuckets] = buckets[i % maxBuckets] || [];
    // only add to bucket if it's not full already
    if (buckets[i % maxBuckets].length < 100 / maxBuckets) {
      buckets[i % maxBuckets] = buckets[i % maxBuckets].concat(hostBuckets[host]);
      // only remove host from the list once it's found a home
      hosts.shift();
    }
  }

  const bucketPromises = [];
  for (let i = 0; i < buckets.length; i++) {
    bucketPromises.push(handleUnreachablesBucketAsync(i, srvr, buckets[i]));
  }
  await Promise.all(bucketPromises);
  console.log(chalk.yellow("Done!"), srvr);
};

/**
 * Try to fix unreachable assets
 */
function start(cb) {
  console.log("Fix unreachable assets.");
  const servers_to_contact = [
    //"http://localhost:3002",
    "http://dev-api-replay.foresee.com",
    "http://qa-api-replay.foresee.com",
    "https://api-replay.foresee.com",
  ];
  const proms = [];
  servers_to_contact.forEach(sv => {
    proms.push(handleUnreachablesAsync(sv));
  });
  Promise.all(proms)
    .then(() => {
      lastRunUrls = thisRunUrls;
      thisRunUrls = new Set();
      console.log("Complete!");
      cb();
    })
    .catch(e => {
      console.log("Failed:", e);
      cb();
    });
}

function delay(next) {
  return function() {
    setTimeout(function() {
      next(delay(next));
    }, 30000);
  };
}

function loop() {
  start(delay(start));
}

module.exports = function(loopIt, cb) {
  if (loopIt) {
    loop(cb);
  } else {
    start(cb);
  }
};
