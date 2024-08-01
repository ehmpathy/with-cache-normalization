import { UnexpectedCodePathError } from '@ehmpathy/error-fns';
import { SimpleAsyncCache, SimpleCache } from 'with-simple-caching';

import {
  NormalizeCacheValueMethod,
  SerializableObject,
} from '../../domain/NormalizeCacheValueMethod';
import {
  CACHE_NORMALIZATION_FOREIGN_KEY_REGEXP,
  withDenormalization,
} from './withDenormalization';

/**
 * a wrapper which augments a cache to add normalization on set and denormalization on get
 */
export const withNormalization = <T extends SerializableObject>(
  cache: SimpleCache<T>,
  {
    normalize,
    referenceSecondsUntilExpiration = 30 * 24 * 60 * 60,
  }: {
    normalize: NormalizeCacheValueMethod;

    /**
     * the number of seconds until the referenced normalized values expire
     *
     * note
     * - this should be pretty long, since this simply garbage collects values after some duration since the last time a query set them
     * - in otherwords, this could invalidate query outputs earlier than when they should be, but can't produce stale responses
     */
    referenceSecondsUntilExpiration?: number;
  },
): SimpleAsyncCache<T> => {
  const cacheWithDenormalization = withDenormalization<T>(cache);
  return {
    ...cacheWithDenormalization,
    set: async (key, value, options) => {
      // normalize the value
      const { value: normalized, references } = normalize({ value });

      // set the normalized value into the cache
      const setNormalizedResult = cache.set(key, normalized as T, options);

      // set each reference into the cache
      const setReferencePromises = Object.entries(references).map(
        ([refKey, refValue]) => {
          // sanity check that the reference will be able to be denormalized later on
          if (!CACHE_NORMALIZATION_FOREIGN_KEY_REGEXP.test(refKey))
            throw new UnexpectedCodePathError(
              'detected an invalid normalization referenceKey',
              { refKey, refValue },
            );

          // set the reference into the cache
          return cache.set(refKey, refValue as T, {
            secondsUntilExpiration: referenceSecondsUntilExpiration,
          });
        },
      );

      // await all of the sets resolving
      await Promise.all([setNormalizedResult, ...setReferencePromises]);
    },
  };
};
