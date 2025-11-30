import { SimpleAsyncCache, SimpleCache } from 'with-simple-cache';

import { SerializableObject } from '../../domain/NormalizeCacheValueMethod';

export const CACHE_NORMALIZATION_FOREIGN_KEY_REGEXP = /^\.cache\.ref\..+$/;

export class CouldNotDereferenceError extends Error {
  constructor({ referenceKey }: { referenceKey: string }) {
    super(
      `Could not find the normalized value referenced by key ${referenceKey} in the cache during denormalization. Has it expired?`,
    );
  }
}

const recursivelyHydrateCachedValueReferences = async ({
  get,
  value,
}: {
  get: SimpleAsyncCache<SerializableObject>['get'];
  value: SerializableObject;
}): Promise<SerializableObject> => {
  // if the value is a string, see if its a reference and hydrate if so
  if (typeof value === 'string') {
    const isAReferenceKey = CACHE_NORMALIZATION_FOREIGN_KEY_REGEXP.test(value);

    // if its not a reference key, then its as hydrated as it can get
    if (!isAReferenceKey) return value;

    // if it is a reference key, get the referenced value!
    const referencedValue = await get(value);
    if (!referencedValue)
      throw new CouldNotDereferenceError({ referenceKey: value }); // !: this error should be caught, warned on, and whole cache.output should be simply treated as invalid -> non existent, due to broken reference
    return referencedValue;
  }

  // since its not a string, if its not an object either, no chance of any further hydration
  if (typeof value !== 'object' || value === null) return value;

  // since its an object, attempt hydration on each of the keys
  const entries = Object.entries(value);
  const entriesHydrated = await Promise.all(
    entries.map(async ([key, val]) => {
      const valHydrated = await recursivelyHydrateCachedValueReferences({
        get,
        value: val,
      });
      return [key, valHydrated]; // use the hydrated value
    }),
  );
  const valueHydrated: SerializableObject = Array.isArray(value)
    ? entriesHydrated.map((entry) => entry[1]) // if original value was an array, then the entry keys are just the index positions
    : Object.fromEntries(entriesHydrated);
  return valueHydrated;
};

/**
 * a utility which dereferences values in a cached output, ensuring the output is fully hydrated
 *
 * specifically
 * - looks up the value of each reference in the .get output
 * - replaces the reference in the .get output with the true value
 * - does so recursively
 *
 * usecases
 * - normalizing data that changes from multiple operates into its own cache key, to enable automatic cache updates
 *
 * note
 * - this is typically used to denormalize output normalized with the `withNormalization` method
 */
export const withDenormalization = <T extends SerializableObject>(
  cache: SimpleCache<T>,
): SimpleAsyncCache<T> => {
  return {
    ...cache,
    set: async (...args) => cache.set(...args), // must cast this to return a promise, to fulfill async cache output
    get: async (key) => {
      // get the cached value
      const found = await cache.get(key);

      // if nothing found, nothing more to do
      if (!found) return found;

      // recursively walk through all object keys and hydrate any references found
      const hydrated: T = (await recursivelyHydrateCachedValueReferences({
        get: async (thisKey) => cache.get(thisKey),
        value: found,
      })) as T;

      // return the hydrated value
      return hydrated;
    },
  };
};
