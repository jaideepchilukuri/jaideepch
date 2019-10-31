import * as fs from "../../fs/index";
import { _fsDefine } from "./amd";

/**
 * Expose a module to the world
 */

_fsDefine("fs", () => fs);

// Backwards compatibility
_fsDefine("_acs", () => fs);
