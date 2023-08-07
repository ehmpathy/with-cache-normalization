import {
  DomainEntity,
  DomainValueObject,
  deserialize,
  serialize,
} from 'domain-objects';
import { SimpleAsyncCache } from 'with-simple-caching';

import { SerializableObject } from '../../domain/NormalizeCacheValueMethod';
import {
  getCacheReferenceKeyForDomainObject,
  normalizeDomainObjectReferences,
} from '../normalizers/normalizeDomainObjectReferences';
import { withNormalization } from './withNormalization';
import { withSerialization } from './withSerialization';

interface Ship {
  // international ship id
  isid: string;

  // name
  name: string;
}
class Ship extends DomainEntity<Ship> implements Ship {
  public static unique = ['isid'];
}

interface Geocode {
  latitude: number;
  longitude: number;
}
class Geocode extends DomainValueObject<Geocode> implements Geocode {}

describe('withNormalization', () => {
  beforeEach(() => jest.clearAllMocks());

  const exampleStore: Record<string, any> = {};
  const cacheGetMock = jest.fn((key) => exampleStore[key]);
  const cacheSetMock = jest.fn((key, value) => (exampleStore[key] = value));
  const cache: SimpleAsyncCache<SerializableObject> = {
    get: cacheGetMock,
    set: cacheSetMock,
  };
  const cacheWithNormalization = withNormalization(cache, {
    normalize: normalizeDomainObjectReferences,
  });

  it('should be able to normalize direct reference set to the cache', async () => {
    const ship = new Ship({ isid: '__isid__', name: 'boaty mcboatface' });
    const shipReferenceKey = getCacheReferenceKeyForDomainObject(ship);

    // should set the reference and normalized value
    await cacheWithNormalization.set('__key__', ship);
    expect(cacheSetMock).toHaveBeenCalledWith(
      shipReferenceKey,
      ship,
      expect.any(Object),
    );
    expect(cacheSetMock).toHaveBeenCalledWith(
      '__key__',
      shipReferenceKey,
      undefined,
    );

    // should get the denormalized value
    const found = await cacheWithNormalization.get('__key__');
    expect(found).toEqual(ship);
  });
  it('should be able to normalize nested references set to the cache', async () => {
    const ship = new Ship({ isid: '__isid__', name: 'boaty mcboatface' });
    const shipReferenceKey = getCacheReferenceKeyForDomainObject(ship);

    // should set the reference and normalized value
    await cacheWithNormalization.set('__key__', { ship, color: 'green' });
    expect(cacheSetMock).toHaveBeenCalledWith(
      shipReferenceKey,
      ship,
      expect.any(Object),
    );
    expect(cacheSetMock).toHaveBeenCalledWith(
      '__key__',
      { ship: shipReferenceKey, color: 'green' },
      undefined,
    );

    // should get the denormalized value
    const found = await cacheWithNormalization.get('__key__');
    expect(found).toEqual({ ship, color: 'green' });
  });
  it('should be able to normalize deeply nested references set to the cache', async () => {
    const ship = new Ship({ isid: '__isid__', name: 'boaty mcboatface' });
    const shipReferenceKey = getCacheReferenceKeyForDomainObject(ship);
    const geocode = new Geocode({ latitude: 821, longitude: 1215 });
    const geocodeReferenceKey = getCacheReferenceKeyForDomainObject(geocode);

    // should set the reference and normalized value
    await cacheWithNormalization.set('__key__', {
      ship,
      color: 'green',
      position: { geocode },
    });
    expect(cacheSetMock).toHaveBeenCalledWith(
      shipReferenceKey,
      ship,
      expect.any(Object),
    );
    expect(cacheSetMock).toHaveBeenCalledWith(
      geocodeReferenceKey,
      geocode,
      expect.any(Object),
    );
    expect(cacheSetMock).toHaveBeenCalledWith(
      '__key__',
      {
        ship: shipReferenceKey,
        color: 'green',
        position: { geocode: geocodeReferenceKey },
      },
      undefined,
    );

    // should get the denormalized value
    const found = await cacheWithNormalization.get('__key__');
    expect(found).toEqual({
      ship,
      color: 'green',
      position: { geocode },
    });
  });
  it('should be able to normalize deeply nested references set to a cache with serialization', async () => {
    const cacheOfString: SimpleAsyncCache<string> = {
      get: cacheGetMock,
      set: cacheSetMock,
    };
    const cacheOfStringWithSerialization = withSerialization(cacheOfString, {
      serialize: serialize,
      deserialize: (value) => deserialize(value, { with: [Ship, Geocode] }),
    });
    const cacheOfStringWithSerializationAndNormalization = withNormalization(
      cacheOfStringWithSerialization,
      {
        normalize: normalizeDomainObjectReferences,
      },
    );

    const ship = new Ship({ isid: '__isid__', name: 'boaty mcboatface' });
    const shipReferenceKey = getCacheReferenceKeyForDomainObject(ship);
    const geocode = new Geocode({ latitude: 821, longitude: 1215 });
    const geocodeReferenceKey = getCacheReferenceKeyForDomainObject(geocode);

    // should set the reference and normalized value
    await cacheOfStringWithSerializationAndNormalization.set('__key__', {
      ship,
      color: 'green',
      position: { geocode },
    });
    expect(cacheSetMock).toHaveBeenCalledWith(
      shipReferenceKey,
      serialize(ship),
      expect.any(Object),
    );
    expect(cacheSetMock).toHaveBeenCalledWith(
      geocodeReferenceKey,
      serialize(geocode),
      expect.any(Object),
    );
    expect(cacheSetMock).toHaveBeenCalledWith(
      '__key__',
      serialize({
        ship: shipReferenceKey,
        color: 'green',
        position: { geocode: geocodeReferenceKey },
      }),
      undefined,
    );

    // should get the denormalized value
    const found = await cacheOfStringWithSerializationAndNormalization.get(
      '__key__',
    );
    expect(found).toEqual({
      ship,
      color: 'green',
      position: { geocode },
    });
  });
});
