import { UnexpectedCodePathError } from '@ehmpathy/error-fns';
import { DomainObject, getUniqueIdentifierSlug } from 'domain-objects';

import {
  NormalizeCacheValueMethod,
  NormalizeCacheValueMethodOutput,
  SerializableObject,
} from '../../domain/NormalizeCacheValueMethod';
import { CACHE_NORMALIZATION_FOREIGN_KEY_REGEXP } from '../wrappers/withDenormalization';

export const getCacheReferenceKeyForDomainObject = (
  dobj: DomainObject<any>,
): string => `.cache.ref.${getUniqueIdentifierSlug(dobj)}`;

const recursivelyNormalizeDomainObjectReferences = (
  value: SerializableObject,
): NormalizeCacheValueMethodOutput => {
  // if the value is not an object, return - no chance of it containing a domain object
  if (typeof value !== 'object' || value === null)
    return { value, references: {} };

  // if the value is a domain object itself, then normalize the reference for it
  if (value instanceof DomainObject) {
    const referenceKey = getCacheReferenceKeyForDomainObject(value);
    if (!CACHE_NORMALIZATION_FOREIGN_KEY_REGEXP.test(referenceKey))
      throw new UnexpectedCodePathError(
        'detected an invalid reference key produced by recursivelyNormalizeDomainObjectReferences',
        { referenceKey, forDobj: value },
      );
    return {
      value: referenceKey,
      references: {
        [referenceKey]: value,
      },
    };
  }

  // otherwise, iterate over each key, and recursively normalize, and merge the results
  const entries = Object.entries(value);
  const references: Record<string, SerializableObject> = {};
  const entriesNormalized = entries.map(([key, val]) => {
    const normalized = recursivelyNormalizeDomainObjectReferences(val);
    Object.assign(references, normalized.references); // merge the references
    return [key, normalized.value]; // keep the normalized value
  });
  const valueNormalized = Array.isArray(value)
    ? entriesNormalized.map((entry) => entry[1]) // if original value was an array, then the entry keys are just the index positions
    : Object.fromEntries(entriesNormalized);
  return { value: valueNormalized, references };
};

/**
 * a method which can be used to normalize a cache value by extracting references the domain-objects contained within it
 *
 * for example
 * - from
 *   ```ts
 *       {
 *         'value': {
 *           'ships': [
 *             new Ship({ id: 1, name: 'boaty mcboatface' }),
 *             new Ship({ id: 2, name: 'sea biscuit' }),
 *             new Ship({ id: 1, name: 'boaty mcboatface' }
 *           ]
 *         }
 *       }
 *   ```
 * - to
 *   ```ts
 *       {
 *         'value': {
 *           'ships': [
 *             '.cache.ref.Ship.1',
 *             '.cache.ref.Ship.2',
 *             '.cache.ref.Ship.1',
 *           ]
 *         },
 *         'references': {
 *           '.cache.ref.Ship.1}': new Ship({ id: 1, name: 'boaty mcboatface' ),
 *           '.cache.ref.Ship.2}': new Ship({ id: 2, name: 'sea biscuit' )
 *         }
 *       }
 *   ```
 */
export const normalizeDomainObjectReferences: NormalizeCacheValueMethod = ({
  value,
}: {
  value: SerializableObject;
}) => recursivelyNormalizeDomainObjectReferences(value);
