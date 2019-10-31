import gulp from "gulp";
import loadPlugins from "gulp-load-plugins";
import webpack from "webpack";
import rimraf from "rimraf";
import eslint from "gulp-eslint";

import popupWebpackConfig from "./popup/webpack.config";
import eventWebpackConfig from "./event/webpack.config";
import resourceWebpackConfig from "./resource/webpack.config";
import contentWebpackConfig from "./content/webpack.config";

const plugins = loadPlugins();

gulp.task("lint", () => {
  return gulp.src(["**/*.js","!node_modules/**","!readmeImages/**","!build/**","!assets/**"])
    .pipe(eslint())
    .pipe(eslint.format())
    .pipe(eslint.failAfterError());
});

gulp.task("popup-js", ["clean"], (cb) => {
  webpack(popupWebpackConfig, (err, stats) => {
    if(err) throw new plugins.util.PluginError("webpack", err);

    plugins.util.log("[webpack]", stats.toString());

    cb();
  });
});

gulp.task("event-js", ["clean"], (cb) => {
  webpack(eventWebpackConfig, (err, stats) => {
    if(err) throw new plugins.util.PluginError("webpack", err);

    plugins.util.log("[webpack]", stats.toString());

    cb();
  });
});

gulp.task("resource-js", ["clean"], (cb) => {
  webpack(resourceWebpackConfig, (err, stats) => {
    if(err) throw new plugins.util.PluginError("webpack", err);

    plugins.util.log("[webpack]", stats.toString());

    cb();
  });
});

gulp.task("content-js", ["clean"], (cb) => {
  webpack(contentWebpackConfig, (err, stats) => {
    if(err) throw new plugins.util.PluginError("webpack", err);

    plugins.util.log("[webpack]", stats.toString());

    cb();
  });
});

gulp.task("popup-html", ["clean"], () => {
  return gulp.src("popup/src/index.html")
    .pipe(plugins.rename("popup.html"))
    .pipe(gulp.dest("./build"));
});

gulp.task("copy-manifest", ["clean"], () => {
  return gulp.src("manifest.json")
    .pipe(gulp.dest("./build"));
});

gulp.task("copy-assets", ["clean"], () => {
  return gulp.src("assets/*")
    .pipe(gulp.dest("./build/assets"));
});

gulp.task("clean", (cb) => {
  rimraf("./build", cb);
});

gulp.task("build", ["lint","copy-assets","copy-manifest", "popup-js", "popup-html", "event-js", "content-js", "resource-js"]);

gulp.task("watch", ["default"], () => {
  gulp.watch("popup/**/*", ["build"]);
  gulp.watch("content/**/*", ["build"]);
  gulp.watch("event/**/*", ["build"]);
});

gulp.task("default", ["build"]);
