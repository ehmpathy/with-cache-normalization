import type { SimpleAsyncCache, SimpleCache } from 'with-simple-cache';

import type { SerializableObject } from '../../domain/NormalizeCacheValueMethod';

/**
 * a utility which makes it easy to add normalization to caches which only persist string values
 *
 * specifically
 * - it serializes and deserializes values before setting to the cache
 */
export const withSerialization = <
  T extends SerializableObject = SerializableObject,
>(
  cache: SimpleCache<string>,
  {
    serialize = JSON.stringify,
    deserialize = JSON.parse,
  }: {
    serialize?: (value: T | undefined) => string;
    deserialize?: (value: string) => T;
  } = {},
): SimpleAsyncCache<T> => {
  return {
    ...cache,
    set: async (key, value, options) =>
      cache.set(key, serialize(value), options),
    get: async (key) => {
      const found = await cache.get(key);
      if (!found) return undefined;
      return deserialize(found);
    },
  };
};
