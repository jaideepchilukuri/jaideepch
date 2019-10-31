import { _W, _D, _HD } from "../../fs/util/quickrefs";
import { Promise, isArray, isFunction, nextTick } from "../../fs/index";

/**
 * Module represents an AMD module
 */
class Module {
  /**
   * @param {string} name
   */
  constructor(name) {
    /**
     * The name of the module
     * @type {string}
     */
    this.name = name;

    /**
     * The promise of a value for the module
     * @type {Promise<*>}
     */
    this.promise = new Promise(resolve => (this._resolve = resolve));

    this._loaded = false;
  }

  /**
   * Resolve the module to a value
   * @param {*} value The value of the module or a promise for it
   */
  resolve(value) {
    if (!this._resolve) {
      /* pragma:DEBUG_START */
      console.error(`Module already loaded: ${this.name}`);
      /* pragma:DEBUG_END */
      return;
    }
    this._resolve(value);
    this._resolve = null;
    this._loaded = true;
  }

  /**
   * Is the module resolved?
   * @returns {Boolean} resolved or not
   */
  isResolved() {
    return !this._resolve;
  }

  /**
   * Load the module by script tag
   */
  load() {
    if (this._loaded) return;

    // can only load modules whose name is a url
    if (this.name.indexOf("/") < 0) {
      /* pragma:DEBUG_START */
      console.error(`gw: Refusing to load: ${this.name} -- it is not a url!`);
      /* pragma:DEBUG_END */

      return;
    }

    this._loaded = true;

    const tag = _D.createElement("script");
    tag.type = "text/javascript";
    tag.charset = "utf-8";
    tag.async = true;
    tag.setAttribute("data-name", this.name);

    return new Promise((resolve, reject) => {
      const onload = () => {
        cleanup();
        resolve();
      };

      const onerror = () => {
        cleanup();
        reject(new Error(`Foresee WebSDK failed to load: ${this.name}`));
      };

      function cleanup() {
        tag.removeEventListener("load", onload, false);
        tag.removeEventListener("error", onerror, false);
        tag.parentNode.removeChild(tag);
      }

      tag.addEventListener("load", onload, false);
      tag.addEventListener("error", onerror, false);

      tag.src = this.name;
      _HD.appendChild(tag);
    });
  }
}

/**
 * A registry of AMD modules.
 */
class Registry {
  constructor() {
    this._modules = {};
    this._pending = [];
  }

  /**
   * Loads a list of dependencies if they haven't been loaded yet, and
   * provides them as arguments to the userfn provided.
   *
   * Note: if a module is loaded that exports a startup function, that
   * startup function will be called.
   *
   * @param {string[]} deps The list of dependencies
   * @param {Function} [userfn] Optional function to use those dependencies
   */
  require(deps, userfn) {
    const promises = [];
    for (let i = 0; i < deps.length; i++) {
      if (deps[i] === "exports") {
        // exports module is special
        promises.push({});
      } else {
        const mod = this._getModule(deps[i]);
        promises.push(mod.promise);
        this._load(mod);
      }
    }

    if (userfn) {
      Promise.all(promises).then(impls => {
        // nextTick here to ensure errors are not caught by the promise chain
        nextTick(() => userfn.apply(_W, impls));
      });
    }
  }

  /**
   * Define a module. The name is only optional if the define is in a file
   * just loaded by another module (or the gateway) as a requirement.
   *
   * @param {string} [name] The name of the module to define
   * @param {string[]} deps The list of dependencies for the module
   * @param {Function} implementation Function which returns the module value
   */
  define(name, deps, implementation) {
    if (isFunction(deps)) {
      implementation = deps;
    }

    if (isArray(name)) {
      deps = name;
      name = null;
    }

    const promise = new Promise(resolve => {
      this.require(deps, (...impls) => {
        // need to call this in nexttick so the promise doesn't swallow
        // any exceptions in the script
        nextTick(() => resolve(this._run(implementation, impls)));
      });
    });

    this._register(name, promise);
  }

  /**
   * Get the module, creating it if needed.
   * @private
   */
  _getModule(name) {
    this._modules[name] = this._modules[name] || new Module(name);

    return this._modules[name];
  }

  /**
   * Register a module that was defined or loaded
   * @private
   */
  _register(name, value) {
    if (!name) {
      const scriptTag = _D.currentScript;

      if (!scriptTag) {
        this._pending.push(value);
        return;
      }

      name = scriptTag.getAttribute("data-name");

      /* pragma:DEBUG_START */
      console.log(`gw: Loaded: ${this.name}`);
      /* pragma:DEBUG_END */
    }

    this._getModule(name).resolve(value);
  }

  /**
   * Runs the implementation function of a module.
   * If the implementation exports a startup function that is called too.
   * @private
   */
  _run(implementation, depimpls) {
    // todo: handle deferred loading here
    const value = implementation.apply(_W, depimpls);
    if (value && value.startup) {
      // call the startup function
      value.startup();
    }
    return value;
  }

  /**
   * Loads a module by temporarily adding a script tag to the page.
   * @private
   */
  _load(mod) {
    const prom = mod.load();
    if (!prom) return;

    prom
      .then(() => {
        if (!mod.isResolved()) {
          // do legacy loading on browsers that don't support currentScript
          this._legacyLoad(mod);
        }
      })
      .catch(err => {
        /* pragma:DEBUG_START */
        console.error(err.message);
        /* pragma:DEBUG_END */
      });
  }

  /**
   * This is called only on browsers that don't support document.currentScript.
   * This should be safe to remove once all supported browsers support currentScript.
   * @private
   */
  _legacyLoad(mod) {
    if (this._pending.length < 1) {
      /* pragma:DEBUG_START */
      console.error(`Unable to associate ${mod.name} with loaded code!`);
      /* pragma:DEBUG_END */
      return;
    }

    // Presuming that the first script to load was also the first to run
    const pending = this._pending.shift();

    /* pragma:DEBUG_START */
    console.log(`gw: Loaded: ${mod.name}`);
    /* pragma:DEBUG_END */
    this._register(mod.name, pending);
  }
}

// Set up the global registry
const registry = new Registry();

/**
 * Define a module. The name is only optional if the define is in a file
 * just loaded by another module (or the gateway) as a requirement.
 *
 * @param {string} [name] The name of the module to define
 * @param {string[]} deps The list of dependencies for the module
 * @param {Function} implementation Function which returns the module value
 */
const _fsDefine = registry.define.bind(registry);

/**
 * Loads a list of dependencies if they haven't been loaded yet, and
 * provides them as arguments to the userfn provided.
 *
 * Note: if a module is loaded that exports a startup function, that
 * startup function will be called.
 *
 * @param {string[]} deps The list of dependencies
 * @param {Function} [userfn] Optional function to use those dependencies
 */
const _fsRequire = registry.require.bind(registry);

// Allow them to be requirements
_fsDefine("define", () => _fsDefine);
_fsDefine("require", () => _fsRequire);

// export globally
_W._fsDefine = _W._acsDefine = _fsDefine;
_W._fsRequire = _W._acsRequire = _fsRequire;

export { _fsDefine, _fsRequire };
