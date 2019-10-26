import { isArray } from "./utils";

/**
 * Helper function to recurse the config heirarchy to a specific key
 */
function getNested(obj, key, unsafe = false) {
  const parts = key.split(".");
  let index = 1;
  let node = obj;
  const len = parts.length;
  let nextkey = parts[0];
  while (index < len) {
    node = node[nextkey];
    if (!node) {
      break;
    }
    nextkey = parts[index++];
    // support indexing into an array
    if (isArray(node) && !isNaN(parseFloat(nextkey)) && isFinite(nextkey)) {
      nextkey = +nextkey;
    }
  }
  if (index !== len || !node) {
    if (unsafe) return;
    throw new Error(`Can't find config: ${parts.slice(0, index).join(".")}`);
  }
  return { obj: node, key: nextkey };
}

export { getNested };
