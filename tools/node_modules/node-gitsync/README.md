Node GitSync
===================
Helper library for syncronizing a remote git repository with a local folder, being sure to only pull it down when it does not exist locally.
###Installation &nbsp;  [![npm version](https://badge.fury.io/js/node-gitsync.svg)](https://badge.fury.io/js/node-gitsync)
```sh
npm install node-gitsync
```
###Simple Usage
```javascript
var gitsync = require('node-gitsync');

gitsync({
  'dest': 'relative-path-to-subfolder',
  'repo': 'https://github.com/blah/repo.git',
  'branch': 'name-of-desired-branch'
}, function(err) {
  console.log("done!");
});
```
