/**
 * @preserve
 * DOMPurify https://github.com/cure53/DOMPurify
 *
 * (C) 2015 Mario Heiderich
 * (C) 2019 Verint Systems, Inc. (modified for brevity)
 */
const { hasOwnProperty, setPrototypeOf } = Object;

/* eslint-disable import/exports-last */
export let { apply } = typeof Reflect !== "undefined" && Reflect;

if (!apply) {
  apply = function(fun, thisValue, args) {
    return fun.apply(thisValue, args);
  };
}

export const freeze =
  Object.freeze ||
  function(x) {
    return x;
  };

/* Add properties to a lookup table */
export function addToSet(set, array) {
  if (setPrototypeOf) {
    // Make 'in' and truthy checks like Boolean(set.constructor)
    // independent of any properties defined on Object.prototype.
    // Prevent prototype setters from intercepting set as a this value.
    setPrototypeOf(set, null);
  }

  let l = array.length;
  while (l--) {
    let element = array[l];
    if (typeof element === "string") {
      const lcElement = element.toLowerCase();
      if (lcElement !== element) {
        // Config presets (e.g. tags.js, attrs.js) are immutable.
        if (!Object.isFrozen(array)) {
          array[l] = lcElement;
        }

        element = lcElement;
      }
    }

    set[element] = true;
  }

  return set;
}

/* Shallow clone an object */
export function clone(object) {
  const newObject = {};

  let property;
  for (property in object) {
    if (apply(hasOwnProperty, object, [property])) {
      newObject[property] = object[property];
    }
  }

  return newObject;
}
