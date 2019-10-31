_fsDefine(["fs", _fsNormalizeUrl('$fs.utils.js')], function(fs, utils) {

  console.warn("FS TRIGGER INIT in 19.9.0 which needed FS:", fs, " AND UTILS: ", utils);

  return {
    iam: "trigger"
  };
});