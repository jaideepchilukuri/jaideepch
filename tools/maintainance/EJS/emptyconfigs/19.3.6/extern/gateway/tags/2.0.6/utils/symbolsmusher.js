var through = require('through');
var os = require('os');
var path = require('path');
var gutil = require('gulp-util');

module.exports = function (config) {
    // Get the configuration
    var hasFirstFile = false,
        firstFl = null;

    return through(function (file) {
        if (file.isNull()) return; // ignore
        if (file.isStream()) return this.emit('error', new PluginError('buildutil', 'Streaming not supported'));

        if (!hasFirstFile) {
            hasFirstFile = true;
            firstFl = file;
        }
    }, function () {
        var finalContents = firstFl.contents.toString('utf8');

        var symbolCount = 0;

        for (var exp in config) {
            var re = new RegExp("([^a-zA-Z])" + exp + "([^a-zA-Z])", "g");
            finalContents = finalContents.replace(re, "$1_" + symbolCount++ + "$2");
        }

        firstFl.contents = new Buffer(finalContents);

        this.emit('data', firstFl);
        this.emit('end');
    });
};