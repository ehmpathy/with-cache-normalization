import { DomainObject } from 'domain-objects';

/**
 * an object that can be serialized, for example with JSON.stringify
 *
 * todo: use https://github.com/ehmpathy/type-fns/issues/15 instead
 */
export type SerializableObject =
  | string
  | number
  | boolean
  | null
  | undefined
  | { [property: string]: SerializableObject }
  | DomainObject<any>
  | SerializableObject[];

export interface NormalizeCacheValueMethodOutput {
  /**
   * the normalized cache value
   */
  value: SerializableObject;

  /**
   * the references which were extracted from the original cache value
   */
  references: Record<string, SerializableObject>;
}

/**
 * a method which can be used to normalize a cache value
 */
export type NormalizeCacheValueMethod = ({
  value,
}: {
  value: SerializableObject;
}) => NormalizeCacheValueMethodOutput;
