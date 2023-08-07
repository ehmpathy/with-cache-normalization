export {
  NormalizeCacheValueMethod,
  NormalizeCacheValueMethodOutput,
  SerializableObject,
} from './domain/NormalizeCacheValueMethod';
export {
  normalizeDomainObjectReferences,
  getCacheReferenceKeyForDomainObject,
} from './logic/normalizers/normalizeDomainObjectReferences';
export {
  CACHE_NORMALIZATION_FOREIGN_KEY_REGEXP,
  withDenormalization,
} from './logic/wrappers/withDenormalization';
export { withNormalization } from './logic/wrappers/withNormalization';
export { withSerialization } from './logic/wrappers/withSerialization';
