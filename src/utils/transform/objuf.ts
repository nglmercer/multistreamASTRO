type FlattenableValue = string | number | boolean | null | undefined | FlattenableObject | FlattenableArray;
type FlattenableObject = { [key: string]: FlattenableValue };
type FlattenableArray = FlattenableValue[];
type FlattenableInput = FlattenableValue | FlattenableValue[];

type FlattenedValue = string | number | boolean | null | undefined | {} | never[];
type FlattenedObject = { [key: string]: FlattenedValue };

/**
 * Flattens an object or array of objects into a flat structure with dot notation keys.
 * @param input The object, array of objects, or primitive value to flatten
 * @param separator The separator to use in keys (default: "_")
 * @returns Flattened object, array of flattened objects, or original input
 */
function flattenObject<T extends FlattenableInput>(
  input: T, 
  separator: string = "_"
): T extends FlattenableValue[] 
  ? FlattenedObject[] 
  : T extends FlattenableObject 
    ? FlattenedObject 
    : T {
  
  if (Array.isArray(input)) {
    return input.map(item => flattenSingle(item, separator)) as any;
  } else if (typeof input === "object" && input !== null) {
    return flattenSingle(input as FlattenableObject, separator) as any;
  }
  return input as any;
}

/**
 * Unflattens a flattened object or array of flattened objects back to nested structure.
 * @param input The flattened object, array of flattened objects, or primitive to unflatten
 * @param separator The separator used in keys (default: "_")
 * @returns Unflattened object, array of unflattened objects, or original input
 */
function unflattenObject<T extends FlattenedObject | FlattenedObject[] | any>(
  input: T,
  separator: string = "_"
): T extends FlattenedObject[] 
  ? FlattenableObject[] 
  : T extends FlattenedObject 
    ? FlattenableObject 
    : T {
  
  if (Array.isArray(input)) {
    return input.map(item => unflattenSingle(item, separator)) as any;
  } else if (typeof input === "object" && input !== null) {
    return unflattenSingle(input as FlattenedObject, separator) as any;
  }
  return input as any;
}

// Helper function for flattening a single object
function flattenSingle(obj: FlattenableValue, separator: string): FlattenedObject {
  const result: FlattenedObject = {};

  function recurse(current: FlattenableValue, path: string): void {
    if (current === null || typeof current !== "object") {
      if (path) {
        result[path.slice(0, -separator.length)] = current;
      }
      return;
    }

    let isEmpty = true;
    for (const key in current) {
      if (Object.prototype.hasOwnProperty.call(current, key)) {
        isEmpty = false;
        recurse((current as any)[key], path + key + separator);
      }
    }

    if (isEmpty && path) {
      const finalPath = path.slice(0, -separator.length);
      if (finalPath) {
        result[finalPath] = Array.isArray(current) ? [] : {};
      }
    }
  }

  recurse(obj, "");

  // Handle edge case for empty objects/arrays at root level
  if (
    Object.keys(result).length === 0 &&
    typeof obj === "object" &&
    obj !== null &&
    Object.keys(obj as object).length === 0
  ) {
    return {};
  }

  return result;
}

// Helper function for unflattening a single object
function unflattenSingle(obj: FlattenedObject, separator: string): FlattenableObject {
  if (typeof obj !== "object" || Array.isArray(obj) || obj === null) {
    return obj as any;
  }

  if (Object.keys(obj).length === 0) {
    return {};
  }

  const firstParts = Object.keys(obj).map(k => k.split(separator)[0]);
  const shouldBeArray = firstParts.length > 0 && firstParts.every(part => /^\d+$/.test(part));
  const result: FlattenableObject | FlattenableArray = shouldBeArray ? [] : {};

  for (const key in obj) {
    if (!Object.prototype.hasOwnProperty.call(obj, key)) continue;

    const parts = key.split(separator);
    let current: any = result;

    // Navigate/create the nested structure
    for (let i = 0; i < parts.length - 1; i++) {
      const part = parts[i];
      const nextPart = parts[i + 1];
      const nextIsArrayIndex = /^\d+$/.test(nextPart);
      const currentIndex = /^\d+$/.test(part) ? parseInt(part, 10) : part;

      let target = current[currentIndex];

      // Create or fix structure type
      if (target === undefined || target === null || typeof target !== "object") {
        target = nextIsArrayIndex ? [] : {};
        current[currentIndex] = target;
      } else if (nextIsArrayIndex && !Array.isArray(target)) {
        target = [];
        current[currentIndex] = target;
      } else if (!nextIsArrayIndex && Array.isArray(target)) {
        target = {};
        current[currentIndex] = target;
      }

      current = target;

      if (typeof current !== "object" || current === null) {
        console.error(`Unflattening error: Path segment ${part} in key ${key} did not lead to an object/array.`);
        break;
      }
    }

    if (typeof current !== "object" || current === null) continue;

    // Assign final value
    const lastPart = parts[parts.length - 1];
    const lastIndex = /^\d+$/.test(lastPart) ? parseInt(lastPart, 10) : lastPart;
    current[lastIndex] = obj[key];
  }

  return result as FlattenableObject;
}
export {
    flattenObject,
    unflattenObject
}
// Example usage:
/*
const nested = {
  user: {
    name: "John",
    address: {
      street: "123 Main St",
      city: "NYC"
    },
    hobbies: ["reading", "coding"]
  }
};

const flattened = flattenObject(nested);
console.log(flattened);
// Output: { "user_name": "John", "user_address_street": "123 Main St", "user_address_city": "NYC", "user_hobbies_0": "reading", "user_hobbies_1": "coding" }

const unflattened = unflattenObject(flattened);
console.log(unflattened);
// Output: Original nested structure
*/